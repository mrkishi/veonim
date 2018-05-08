import { ActivationEvent, ActivationEventType, LanguageActivationResult, ActivationResultKind } from '../interfaces/extension'
import { merge, getDirFiles, readFile, fromJSON, is, uuid } from '../support/utils'
import WorkerClient from '../messaging/worker-client'
// import { EXT_PATH } from '../config/default-configs'
import { ChildProcess } from 'child_process'
import { basename, join } from 'path'
import * as rpc from 'vscode-jsonrpc'
import '../support/vscode-shim'
// TODO: remove/deprecate jsonrpc module in messaging

// TODO: TEMP ONLY
import { configPath } from '../support/utils'
const EXT_PATH = join(configPath, 'veonim', 'ext2')

// need this flag to spawn node child processes. this will use the same node
// runtime included with electron. usually we would set this as an option in
// the spawn call, but we do not have access to the spawn calls in the
// extensions that are spawning node executables (language servers, etc.)
process.env.ELECTRON_RUN_AS_NODE = '1'

interface Extension {
  requirePath: string,
  activationEvents: ActivationEvent[],
}

interface ExtensionLocation {
  packagePath: string,
  packageJson: string,
}

interface ActivateOpts {
  kind: string,
  data: string,
}

interface ServerBridgeParams {
  serverId: string,
  method: string,
  params: any[],
}

const { on, call, request } = WorkerClient()
const runningLanguageServers = new Map<string, rpc.MessageConnection>()

on.activate(({ kind, data }: ActivateOpts) => {
  if (kind === 'language') return activate.language(data)
})

on.load(() => load())

on.server_sendNotification(({ serverId, method, params }: ServerBridgeParams) => {
  const server = runningLanguageServers.get(serverId)
  if (!server) return
  server.sendNotification(method, ...params)
})

on.server_sendRequest(({ serverId, method, params }: ServerBridgeParams) => {
  const server = runningLanguageServers.get(serverId)
  if (!server) return
  return server.sendRequest(method, ...params)
})

on.server_onNotification(({ serverId, method }: ServerBridgeParams) => {
  const server = runningLanguageServers.get(serverId)
  if (!server) return
  server.onNotification(method, (...args) => call[`${serverId}:${method}`](args))
})

on.server_onRequest(({ serverId, method }: ServerBridgeParams) => {
  const server = runningLanguageServers.get(serverId)
  if (!server) return
  server.onRequest(method, async (...args) => request[`${serverId}:${method}`](args))
})

on.server_onError(({ serverId }: ServerBridgeParams) => {
  const server = runningLanguageServers.get(serverId)
  if (!server) return
  server.onError(err => call[`${serverId}:onError`](err))
})

on.server_onClose(({ serverId }: ServerBridgeParams) => {
  const server = runningLanguageServers.get(serverId)
  if (!server) return
  server.onClose(() => call[`${serverId}:onClose`]())
})

const extensions = new Map<string, Extension>()
const languageExtensions = new Map<string, string>()

const findExtensions = async (): Promise<ExtensionLocation[]> => {
  const extensionDirs = (await getDirFiles(EXT_PATH)).filter(m => m.dir)
  const dirFiles = await Promise.all(extensionDirs.map(async m => ({
    dir: m.path,
    files: await getDirFiles(m.path),
  })))

  return dirFiles
    .filter(m => m.files.some(f => f.name.toLowerCase() === 'package.json'))
    .map(m => ({
      packagePath: m.dir,
      packageJson: (m.files.find(f => f.name.toLowerCase() === 'package.json') || { path: '' }).path
    }))
}

const getPackageJsonConfig = async ({ packagePath, packageJson }: ExtensionLocation): Promise<Extension> => {
  const rawFileData = await readFile(packageJson)
  const { main, activationEvents = [] } = fromJSON(rawFileData).or({})

  const parsedActivationEvents = activationEvents.map((m: string) => ({
    type: m.split(':')[0] as ActivationEventType,
    value: m.split(':')[1],
  }))

  return {
    requirePath: join(packagePath, main),
    activationEvents: parsedActivationEvents,
  }
}

const load = async () => {
  const extensionPaths = await findExtensions()
  const extensionData = await Promise.all(extensionPaths.map(m => getPackageJsonConfig(m)))

  extensions.clear()
  languageExtensions.clear()

  extensionData.forEach(m => {
    extensions.set(m.requirePath, m)
    m.activationEvents
      .filter(a => a.type === ActivationEventType.Language)
      .forEach(a => languageExtensions.set(a.value, m.requirePath))
  })
}

const connectLanguageServer = (proc: ChildProcess): string => {
  const serverId = uuid()

  const reader = new rpc.StreamMessageReader(proc.stdout)
  const writer = new rpc.StreamMessageWriter(proc.stdin)
  const conn = rpc.createMessageConnection(reader, writer)

  conn.listen()

  runningLanguageServers.set(serverId, conn)
  return serverId
}

const activate = {
  language: async (language: string): Promise<LanguageActivationResult> => {
    const modulePath = languageExtensions.get(language)
    if (!modulePath) return { status: ActivationResultKind.NotExist }

    const extension = require(modulePath)

    if (!extension.activate) return {
      status: ActivationResultKind.Fail,
      reason: `extension ${basename(modulePath)} does not have a .activate() method`
    }

    const result: LanguageActivationResult = { status: ActivationResultKind.Success }
    const context = { subscriptions: [] }

    await extension.activate(context).catch((reason: any) => merge(result, {
      reason,
      status: ActivationResultKind.Fail,
    }))

    if (result.status === ActivationResultKind.Fail) return result

    const [ serverActivator ] = context.subscriptions

    if (!is.promise(serverActivator)) return {
      reason: `server activator function not valid or did not return a promise: ${language} - ${modulePath}`,
      status: ActivationResultKind.Fail,
    }

    const childProcess = await serverActivator
    const serverId = connectLanguageServer(childProcess)

    return { serverId, status: ActivationResultKind.Success }
  }
}
