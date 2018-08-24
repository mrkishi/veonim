import { StreamMessageReader, StreamMessageWriter, createProtocolConnection, ProtocolConnection } from 'vscode-languageserver-protocol'
import { readFile, fromJSON, is, uuid, getDirs, getFiles } from '../support/utils'
import WorkerClient from '../messaging/worker-client'
import { EXT_PATH } from '../config/default-configs'
import { basename, dirname, join } from 'path'
import { ChildProcess } from 'child_process'
import '../support/vscode-shim'

// need this flag to spawn node child processes. this will use the same node
// runtime included with electron. usually we would set this as an option in
// the spawn call, but we do not have access to the spawn calls in the
// extensions that are spawning node executables (language servers, etc.)
process.env.ELECTRON_RUN_AS_NODE = '1'

enum ActivationEventType {
  WorkspaceContains = 'workspaceContains',
  Language = 'onLanguage',
  Command = 'onCommand',
  Debug = 'onDebug',
  View = 'onView',
  Always  = '*',
}

interface ActivationEvent {
  type: ActivationEventType,
  value: string,
}

interface Extension {
  requirePath: string,
  activationEvents: ActivationEvent[],
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
const runningLanguageServers = new Map<string, ProtocolConnection>()

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
  getServer(serverId).sendNotification(method as any, ...params)
})

on.server_sendRequest(({ serverId, method, params }: ServerBridgeParams) => {
  return getServer(serverId).sendRequest(method, ...params)
})

on.server_onNotification(({ serverId, method }: ServerBridgeParams) => {
  getServer(serverId).onNotification(method, (...args: any[]) => call[`${serverId}:${method}`](args))
})

on.server_onRequest(({ serverId, method }: ServerBridgeParams) => {
  getServer(serverId).onRequest(method, async (...args: any[]) => request[`${serverId}:${method}`](args))
})

on.server_onError(({ serverId }: ServerBridgeParams) => {
  getServer(serverId).onError((err: any) => call[`${serverId}:onError`](err))
})

on.server_onClose(({ serverId }: ServerBridgeParams) => {
  getServer(serverId).onClose(() => call[`${serverId}:onClose`]())
})

const extensions = new Map<string, Extension>()
const languageExtensions = new Map<string, string>()

// so we download the zip file into user--repo dir. this dir will then contain
// a folder with the extension contents. it will look something like the following:
// ~/.config/veonim/extensions/veonim--ext-json/ext-json-master/package.json
// ~/.config/veonim/extensions/vspublisher--vscode-extension/extension/package.json
const findPackageJson = async (packageDir: string) => {
  const [ firstDir ] = await getDirs(packageDir)
  if (!firstDir) throw new Error(`empty package dir: ${packageDir}`)

  const filesInDir = await getFiles(firstDir.path)
  const packagePath = filesInDir.find(m => m.path.endsWith('package.json'))
  return (packagePath || {} as any).path
}

const findExtensions = async () => {
  const extensionDirs = await getDirs(EXT_PATH)
  return Promise.all(extensionDirs.map(m => findPackageJson(m.path)))
}

const getPackageJsonConfig = async (packageJson: string): Promise<Extension> => {
  const rawFileData = await readFile(packageJson)
  const { main, activationEvents = [] } = fromJSON(rawFileData).or({})
  const packageJsonDir = dirname(packageJson)

  const parsedActivationEvents = activationEvents.map((m: string) => ({
    type: m.split(':')[0] as ActivationEventType,
    value: m.split(':')[1],
  }))

  return {
    requirePath: join(packageJsonDir, main),
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

  const reader = new StreamMessageReader(proc.stdout)
  const writer = new StreamMessageWriter(proc.stdin)
  const conn = createProtocolConnection(reader, writer, console)

  conn.listen()

  runningLanguageServers.set(serverId, conn)
  return serverId
}

const activateExtensionForLanguage = async (language: string) => {
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
