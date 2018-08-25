import { StreamMessageReader, StreamMessageWriter, createProtocolConnection, ProtocolConnection } from 'vscode-languageserver-protocol'
import DebugProtocolConnection, { DebugAdapterConnection } from '../messaging/debug-protocol'
import { readFile, fromJSON, is, uuid, getDirs, getFiles, merge } from '../support/utils'
import { collectDebuggersFromExtensions } from '../extensions/debuggers'
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

// TODO: can we consolidate these interfaces?
interface DaRealDebugger extends Debugger {
  initialConfigurations?: any[]
  hasInitialConfiguration: boolean
  hasConfigurationProvider: boolean
  extension: Extension,
}

interface Disposable {
  dispose: () => any
  [index: string]: any
}

// TODO: THIS LEAKS OUTSIDE OF WORKER!
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
  DebugInitialConfigs = 'onDebugInitialConfigurations',
  DebugResolve = 'onDebugResolve',
  View = 'onView',
  Always  = '*',
}

interface ActivationEvent {
  type: ActivationEventType,
  value: string,
}

interface ExtensionInfo {
  name: string
  publisher: string
}

export interface Extension extends ExtensionInfo {
  config: any
  packagePath: string
  requirePath: string
  extensionDependencies: string[]
  activationEvents: ActivationEvent[]
}

interface ActivateOpts {
  kind: string
  data: string
}

interface ServerBridgeParams {
  serverId: string
  method: string
  params: any[]
}

const { on, call, request } = WorkerClient()
const extensions = new Set<Extension>()
const languageExtensions = new Map<string, Extension>()
const runningLangServers = new Map<string, ProtocolConnection>()
const runningDebugAdapters = new Map<string, DebugAdapterConnection>()
const debuggers = new Map<string, DaRealDebugger>()

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

const getDebugAdapter = (id: string) => {
  const server = runningDebugAdapters.get(id)
  if (!server) throw new Error(`fail to get debug adapter ${id}. this should not happen... ever.`)
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

on.debug_sendRequest(({ serverId, command, args }: any) => {
  return getDebugAdapter(serverId).sendRequest(command, args)
})

on.debug_sendNotification(({ serverId, response }: any) => {
  getDebugAdapter(serverId).sendNotification(response)
})

on.debug_onNotification(({ serverId, method }: any) => {
  getDebugAdapter(serverId).onNotification(method, a => call[`${serverId}:${method}`](a))
})

on.debug_onRequest(({ serverId }: any) => {
  getDebugAdapter(serverId).onRequest(a => call[`${serverId}:onRequest`](a))
})

on.debug_onError(({ serverId }: any) => {
  getDebugAdapter(serverId).onError(a => call[`${serverId}:onError`](a))
})

on.debug_onClose(({ serverId }: any) => {
  getDebugAdapter(serverId).onClose(() => call[`${serverId}:onClose`]())
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

const parseExtensionDependency = (extString: string): ExtensionInfo => {
  const [ publisher, name ] = extString.split('.')
  return { publisher, name }
}

const findExtensionDependency = ({ name, publisher }: ExtensionInfo) => [...extensions]
  .find(e => e.name === name && e.publisher === publisher)

// TODO: handle recursive dependencies. THIS IDEA SUCKS WTF
const installExtensionsIfNeeded = (extensions: string[]) => extensions
  .map(parseExtensionDependency)
  .map(e => ({ ...e, installed: !!findExtensionDependency(e) }))
  .forEach(e => {
    if (!e.installed) console.warn('NYI: please install extension dependency:', e)
    // TODO: actually install it lol
    // and do the whole package.json parse routine
    // and we need to do it recursively... sheesh great design here
  })

const getExtensionDebuggers = (extension: Extension): DaRealDebugger[] => {
  const debuggers = pleaseGet(extension.config).contributes.debuggers([]) as any[]
  return debuggers.map(d => ({
    extension,
    type: d.type,
    label: d.label,
    program: d.program,
    runtime: d.runtime,
    initialConfigurations: d.initialConfigurations,
    hasInitialConfiguration: !!d.initialConfigurations,
    // TODO: how do we get dis
    // maybe this is a function that gets called, since it's dynamic
    // then we can have an activate function to activate the extension
    // under various activationEvents (specified as params in func)
    hasConfigurationProvider: false,
  }))
}

const getAvailableDebuggers = async (debuggers: DaRealDebugger[]): DaRealDebugger[] => {
  const hasNeededActivationEvent = ae => ae.type === ActivationEventType.Debug
    || ae.type === ActivationEventType.DebugInitialConfigs

  const activations = debuggers
    .filter(d => d.extension.activationEvents.some(hasNeededActivationEvent))
    .map(d => activateExtension(d.extension))

  // TODO: need to reach into the vscode api and get the debug provider funcs (and call them)

  const subs = await Promise.all(activations)
  return subs
}

const collectDebuggers = (extensions: Extension[]): DaRealDebugger[] => {
  // TODO: initialConfigurations are static in the json, right? so we don't need to activat
  // extneions to determine dis.
  //
  // we only need to activate extensions to know if they have a debug configuration provider
  // also... we may be activating these extensions multiple times. is that okay?
  // as i recall vsc activates multiple times...?

  // according to docs, initialConfigurations are used AFTER dynamic debug config...

  // await activate extensions 'onDebugInitialConfigurations'
  // await activate extensions 'onDebug'

  const debuggers = extensions.reduce((res, ext) => {
    const extDebuggers = getExtensionDebuggers(ext)
    return [...res, ...extDebuggers]
  }, [] as DaRealDebugger[])

  return debuggers
}

const getDebuggersWithConfig = (debuggers: DaRealDebugger[]): DaRealDebugger[] => {
  return debuggers.filter(d => d.hasInitialConfiguration || d.hasConfigurationProvider)
}

const getPackageJsonConfig = async (packageJson: string): Promise<Extension> => {
  const rawFileData = await readFile(packageJson)
  const config = fromJSON(rawFileData).or({})
  const { name, publisher, main, activationEvents = [], extensionDependencies = [] } = config
  const packagePath = dirname(packageJson)

  const parsedActivationEvents = activationEvents.map((m: string) => ({
    type: m.split(':')[0] as ActivationEventType,
    value: m.split(':')[1],
  }))

  return {
    name,
    publisher,
    config,
    packagePath,
    extensionDependencies,
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

    if (ext.extensionDependencies.length) installExtensionsIfNeeded(ext.extensionDependencies)

    ext.activationEvents
      .filter(a => a.type === ActivationEventType.Language)
      .forEach(a => languageExtensions.set(a.value, ext))
  })

  const extensionDebuggers = collectDebuggers(extensionsWithConfig)
  extensionDebuggers.forEach(ed => debuggers.set(ed.type, ed))
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

const activateExtension = async (e: Extension): Promise<Disposable[]> => {
  const requirePath = e.requirePath
  const extName = basename(requirePath)

  const extension = require(requirePath)
  if (!extension.activate) {
    console.error(`extension ${extName} does not have a .activate() method`)
    return [] as any[]
  }

  const context = { subscriptions: [] as any[] }
  await extension.activate(context).catch((err: any) => console.error(extName, err))

  return context.subscriptions
}

const activateExtensionForLanguage = async (language: string) => {
  const extension = languageExtensions.get(language)
  if (!extension) {
    console.error(`extension for ${language} not found`)
    return []
  }

  return activateExtension(extension)
}

const activate = {
  language: async (language: string) => {
    // TODO: handle extension dependencies
    const subscriptions = await activateExtensionForLanguage(language)
    if (!subscriptions.length) return

    // TODO: potentially other subscriptions disposables
    // how can subs be both disposables and promises that return child processes?
    // would like to double check the typings in vscode
    const [ serverActivator ] = subscriptions as any[]

    if (!is.promise(serverActivator)) {
      console.error(`server activator function not valid or did not return a promise for ${language}`)
      return
    }

    const proc: ChildProcess = await serverActivator
    return connectRPCServer(proc)
  },
}

const start = {
  debugging: () => {
    // TODO: i think some (or most) of this func will have to live
    // in the main thread to access UI prompts
    // TODO: get debug configs from launch.json
    // TODO: if (launch.json exists) prompt user to select configuration to use for debugging

    // if no launch.json or no config chosen...
    const dbgs = getDebuggersWithConfig([...debuggers.values()])
    // TODO: prompt user for debugger to use
    const chosenDebugger = dbgs[0]
    console.log('chosenDebugger', chosenDebugger)
    // TODO: get configuration from chosen debugger
    // TODO: initilaConfigurations has more than 1 config (duh). do we need to ask user
    // to chose a config? check in vsc with python-debug
  },
  debug: async (type: string) => {
    const { extension, debug } = getDebug(type)
    if (!extension) return console.error(`extension for ${type} not found`)

    const availableDebuggers = await getAvailableDebuggers([...debuggers.values()])
    console.log('availableDebuggers', availableDebuggers)

    // TODO: handle recursive extension dependencies
    const activations = extension.extensionDependencies
      .map(parseExtensionDependency)
      .map(e => ({ ...e, ...findExtensionDependency(e) }))
      .map(async e => {
        const extInstalled = (e as Extension).requirePath
        if (!extInstalled) {
          console.error(`extension ${e.name} was not installed before activation`)
          return { dispose: () => {} } as Disposable
        }
        // TODO: only activate if has relevant activation events???? or always activate?
        return activateExtension(e as Extension)
      })

    // TODO: do something with the subscriptions? for later cleanup purposes?
    await Promise.all(activations)

    // TODO: do something with the subscriptions? for later cleanup purposes?
    // TODO: only activate if has relevant activation events???? or always activate?
    await activateExtension(extension)

    // debug activationEvents:
    // - onDebug
    // - onDebugResolve:${type} - wut?
    // - onDebugInitialConfigurations - wut?

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
