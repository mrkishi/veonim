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

on.existsForLanguage((language: string) => Promise.resolve(languageExtensions.has(language)))
on.activate(({ kind, data }: ActivateOpts) => {
  if (kind === 'language') return activate.language(data)
})

on.load(() => load())

const getServer = (id: string) => {
  const server = runningLanguageServers.get(id)
  if (!server) throw new Error(`fail to get lang serv ${id}. this should not happen... ever.`)
  return server
}

on.server_sendNotification(({ serverId, method, params }: ServerBridgeParams) => {
  getServer(serverId).sendNotification(method, ...params)
})

on.server_sendRequest(({ serverId, method, params }: ServerBridgeParams) => {
  return getServer(serverId).sendRequest(method, ...params)
})

on.server_onNotification(({ serverId, method }: ServerBridgeParams) => {
  getServer(serverId).onNotification(method, (...args) => call[`${serverId}:${method}`](args))
})

on.server_onRequest(({ serverId, method }: ServerBridgeParams) => {
  getServer(serverId).onRequest(method, async (...args) => request[`${serverId}:${method}`](args))
})

on.server_onError(({ serverId }: ServerBridgeParams) => {
  getServer(serverId).onError(err => call[`${serverId}:onError`](err))
})

on.server_onClose(({ serverId }: ServerBridgeParams) => {
  getServer(serverId).onClose(() => call[`${serverId}:onClose`]())
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

const activateExtensionForLanguage = async (language: string): any[] => {
  const modulePath = languageExtensions.get(language)
  if (!modulePath) {
    console.error(`extension for ${language} not found`)
    return []
  }

  const extName = basename(modulePath)

  const extension = require(modulePath)
  if (!extension.activate) {
    console.error(`extension ${extName} does not have a .activate() method`)
    return []
  }

  const context = { subscriptions: [] }
  await extension.activate(context).catch((err: any) => console.error(extName, err))

  return context.subscriptions
}

const activate = {
  language: async (language: string) => {
    const subscriptions = await activateExtensionForLanguage(language)
    if (!subscriptions.length) return

    const [ serverActivator ] = subscriptions

    if (!is.promise(serverActivator)) {
      console.error(`server activator function not valid or did not return a promise for ${language}`)
      return
    }

    const childProcess = await serverActivator
    return connectLanguageServer(childProcess)
  }
}
