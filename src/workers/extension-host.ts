import { StreamMessageReader, StreamMessageWriter, createProtocolConnection, ProtocolConnection } from 'vscode-languageserver-protocol'
import { readFile, fromJSON, is, uuid, getDirs, getFiles, merge } from '../support/utils'
import DebugProtocolConnection, { DebugAdapterConnection } from '../messaging/debug-protocol'
import WorkerClient from '../messaging/worker-client'
import { EXT_PATH } from '../config/default-configs'
import { ChildProcess, spawn } from 'child_process'
import { basename, dirname, join } from 'path'
import pleaseGet from '../support/please-get'
import '../support/vscode-shim'

interface Debugger {
  type: string
  label: string
  program: string
  runtime?: 'node' | 'mono'
}

// need this flag to spawn node child processes. this will use the same node
// runtime included with electron. usually we would set this as an option in
// the spawn call, but we do not have access to the spawn calls in the
// extensions that are spawning node executables (language servers, etc.)
process.env.ELECTRON_RUN_AS_NODE = '1'

// TODO: this file is growing a bit big. split out some functionalities into separate modules

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
  config: any,
  packagePath: string,
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
const extensions = new Set<Extension>()
const languageExtensions = new Map<string, string>()
const runningLangServers = new Map<string, ProtocolConnection>()
const runningDebugAdapters = new Map<string, DebugAdapterConnection>()

on.load(() => load())

on.existsForLanguage((language: string) => Promise.resolve(languageExtensions.has(language)))

on.activate(({ kind, data }: ActivateOpts) => {
  if (kind === 'language') return activate.language(data)
})

on.startDebug((type: string) => start.debug(type))

on.listDebuggers(async () => {
  const dbgs = [...extensions]
    .filter(ext => !!pleaseGet(ext.config).contributes.debuggers())
    .map(ext => {
      const debuggers = pleaseGet(ext.config).contributes.debuggers([]) as any
      return debuggers.map((d: any) => ({ type: d.type, label: d.label }))
    })
    .reduce((res: any[], ds: any[]) => [...res, ...ds], [])
    .filter((d: any) => d.type !== 'extensionHost')

  return [...new Set(dbgs)]
})

const getServer = (id: string) => {
  const server = runningLangServers.get(id)
  if (!server) throw new Error(`fail to get serv ${id}. this should not happen... ever.`)
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
  const config = fromJSON(rawFileData).or({})
  const { main, activationEvents = [] } = config
  const packagePath = dirname(packageJson)

  const parsedActivationEvents = activationEvents.map((m: string) => ({
    type: m.split(':')[0] as ActivationEventType,
    value: m.split(':')[1],
  }))

  return {
    config,
    packagePath,
    requirePath: join(packagePath, main),
    activationEvents: parsedActivationEvents,
  }
}

const load = async () => {
  const extensionPaths = await findExtensions()
  const extensionsWithConfig = await Promise.all(extensionPaths.map(m => getPackageJsonConfig(m)))

  extensions.clear()

  extensionsWithConfig.forEach(ext => {
    extensions.add(ext)

    ext.activationEvents
      .filter(a => a.type === ActivationEventType.Language)
      .forEach(a => languageExtensions.set(a.value, ext.requirePath))
  })
}

const connectRPCServer = (proc: ChildProcess): string => {
  const serverId = uuid()

  const reader = new StreamMessageReader(proc.stdout)
  const writer = new StreamMessageWriter(proc.stdin)
  const conn = createProtocolConnection(reader, writer, console)

  conn.listen()

  runningLangServers.set(serverId, conn)
  return serverId
}

const activateExtensionForLanguage = async (language: string) => {
  const requirePath = languageExtensions.get(language)
  if (!requirePath) {
    console.error(`extension for ${language} not found`)
    return []
  }

  const extName = basename(requirePath)

  const extension = require(requirePath)
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

    const proc = await serverActivator
    return connectRPCServer(proc)
  },
}

const start = {
  debug: async (type: string) => {
    const { extension, debug } = getDebug(type)
    if (!extension) return console.error(`extension for ${type} not found`)

    // TODO: if activationEvents:
    // - onDebug
    // - onDebugResolve:${type} - wut?
    // - onDebugInitialConfigurations - wut?
    //
    // call extension.activate() and collect context.subscriptions

    return startDebugger(extension, debug)
  },
}

const getDebug = (type: string) => [...extensions].reduce((res, extension) => {
  const debuggers = pleaseGet(extension.config).contributes.debuggers([])
  const debug = debuggers.find((d: any) => d.type === type)
  return debug ? merge(res, { extension, debug }) : res
}, {} as { extension: Extension, debug: Debugger })

const connectDebugAdapter = (proc: ChildProcess): string => {
  const serverId = uuid()
  const conn = DebugProtocolConnection(proc.stdout, proc.stdin)
  runningDebugAdapters.set(serverId, conn)
  return serverId
}

const startDebugger = (extension: Extension, debug: Debugger) => {
  const adapterPath = join(extension.packagePath, debug.program)
  const proc = startDebugAdapter(adapterPath, debug.runtime)

  // TODO: testing
  proc.stderr.on('data', err => console.error(debug.type, 'errrrrrrr:' + err + ''))
  // TODO: testing

  return connectDebugAdapter(proc)
}

const startDebugAdapter = (debugAdapterPath: string, runtime: Debugger['runtime']): ChildProcess => {
  // TODO: do we need to accept any arguments from launch.json config? (whether user provided or generated)
  const spawnOptions = {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
  }

  let proc

  // if a runtime is not provided, then the debug adapter is a binary executable
  // TODO: support cross-platform executables (see docs for examples)
  // by the way, different platforms may require different executables. see the docs
  // for example combinations of program/runtime
  if (!runtime) proc = spawn(debugAdapterPath, [], spawnOptions)
  else if (runtime === 'node') proc = spawn(process.execPath, [debugAdapterPath], spawnOptions)
  // TODO: figure out how to start a debug adapter with "mono" runtime
  // i do not believe mono runtime comes with vscode (would be surprised if it did)
  // the vscode-mono-debug extension readme asks that the user install mono
  // separately. that means we just need to figure out how to start/run mono
  // if installed and start the debug adapter with it (i.e. is mono in $PATH, etc.)
  else if (runtime === 'mono') throw new Error('debug adapter runtime "mono" not supported yet, but it should!')
  else throw new Error(`invalid debug adapter runtime provided: ${runtime}. are we supposed to support this?`)

  return proc
}
