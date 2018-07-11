import { readFile, fromJSON, uuid } from '../support/utils'
import WorkerClient from '../messaging/worker-client'
import { spawn, ChildProcess } from 'child_process'
import * as rpc from 'vscode-jsonrpc'
import { dirname, join } from 'path'
import '../support/vscode-shim'

interface Debugger {
  label: string
  type: string
  program: string
  runtime?: 'node' | 'mono'
}

interface ServerBridgeParams {
  adapterId: string
  method: string
  params: any[]
}

// -- REFERENCE LINKS --
// https://github.com/Microsoft/vscode-node-debug2/blob/master/package.json
// https://github.com/Microsoft/vscode-chrome-debug/blob/master/package.json
// https://github.com/Microsoft/vscode-mock-debug/blob/master/package.json
// https://code.visualstudio.com/docs/extensionAPI/api-debugging
// https://code.visualstudio.com/docs/extensions/example-debuggers

// download extension for dev debug
// vscode:extension/ms-vscode.node-debug2
// https://ms-vscode.gallery.vsassets.io/_apis/public/gallery/publisher/ms-vscode/extension/node-debug2/latest/assetbyname/Microsoft.VisualStudio.Services.VSIXPackage

// TODO: once i have figured this out, we will dynamically get these vars with the code
// that already exists in extension-host
const TEMP_EXT_DIR = join(process.cwd(), 'memes', 'extension')
const memeConfig = join(TEMP_EXT_DIR, 'package.json')

const { on, call, request } = WorkerClient()

const getAdapter = (id: string) => {
  const server = runningDebugAdapters.get(id)
  if (!server) throw new Error(`fail to get lang serv ${id}. this should not happen... ever.`)
  return server
}

on.server_sendNotification(({ adapterId, method, params }: ServerBridgeParams) => {
  getAdapter(adapterId).sendNotification(method, ...params)
})

on.server_sendRequest(({ adapterId, method, params }: ServerBridgeParams) => {
  return getAdapter(adapterId).sendRequest(method, ...params)
})

on.server_onNotification(({ adapterId, method }: ServerBridgeParams) => {
  getAdapter(adapterId).onNotification(method, (...args) => call[`${adapterId}:${method}`](args))
})

on.server_onRequest(({ adapterId, method }: ServerBridgeParams) => {
  getAdapter(adapterId).onRequest(method, async (...args) => request[`${adapterId}:${method}`](args))
})

on.server_onError(({ adapterId }: ServerBridgeParams) => {
  getAdapter(adapterId).onError(err => call[`${adapterId}:onError`](err))
})

on.server_onClose(({ adapterId }: ServerBridgeParams) => {
  getAdapter(adapterId).onClose(() => call[`${adapterId}:onClose`]())
})

const availableDebugAdapters = new Map<string, Debugger>()
const runningDebugAdapters = new Map<string, rpc.createMessageConnection>()

const getPackageJsonConfig = async (packageJson: string): Promise<object> => {
  const rawFileData = await readFile(packageJson)
  const { main, activationEvents = [], contributes } = fromJSON(rawFileData).or({})
  const packageJsonDir = dirname(packageJson)

  const parsedActivationEvents = activationEvents.map((m: string) => ({
    type: m.split(':')[0] as ActivationEventType,
    value: m.split(':')[1],
  }))

  return {
    contributes,
    requirePath: join(packageJsonDir, main),
    activationEvents: parsedActivationEvents,
  }
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

  proc.stderr.on('data', console.error)
  return proc
}

const connectDebugAdapter = (proc: ChildProcess) => {
  const reader = new rpc.StreamMessageReader(proc.stdout)
  const writer = new rpc.StreamMessageWriter(proc.stdin)
  const conn = rpc.createMessageConnection(reader, writer)

  conn.listen()
  return conn
}

const doTheNeedful = async () => {
  const { requirePath, activationEvents, contributes } = await getPackageJsonConfig(memeConfig)
  const { breakpoints, debuggers, commands, keybindings, menus } = contributes

  // COMMANDS
  // what do we use the provided commands for? are they always user-triggered
  // or does vscode ever call them?

  // ACTIVATION EVENTS
  // TODO: how is a debug extension activated???? "activationEvents" and etc.
  // dynamic DebugConfigurationProvider may control this too.
  // read about it here: https://code.visualstudio.com/docs/extensions/example-debuggers#_using-a-debugconfigurationprovider
  //
  // activationEvents used for debugging purposes
  // "onDebug" - triggered as soon as any debug functionality is used
  //
  // TODO: where is DebugConfigurationProvider called and how are these
  // events related to it?

  // "onDebugInitialConfigurations" - is fired just before the
  // 'provideDebugConfigurations' method of the 'DebugConfigurationProvider' is
  // called. (wut?)

  // "onDebugResolve:${type}" - is fired just before the
  // 'resolveDebugConfiguration' method of the 'DebugConfigurationProvider' for
  // the specified type is called. (wut?)
  //
  // some example activationEvents (command events excluded)
  // - mock-debug -> onDebug
  // - node-debug -> onDebugInitialConfigurations, onDebugResolve:node
  // - chrome-debug -> onDebugInitialConfigurations, onDebugResolve:chrome
  // - node-debug2 -> nothing, only a command... wat... how does this start?
  //    - maybe because it's builtin to vscode the startup is hardcoded?
  // - mono-debug -> nothing, only a command... wat??
  //    - perhaps there is no auto start with mono. readme does not specify
  //      anything about auto-start. it says either use cmdline flags or launch.json
  //
  // ok so first of all the debugger is initiated via user action.
  // an extension may provide some default config for the debug adapter
  // in which case it may have some activationEvents (but which?)
  // also, keep in mind that some "debugger extensions" come bundled
  // with other stuff like a general language extension (go, pythong, etc.)
  //  - lsp stuff (but not lsp), debugging, linting, building, etc.

  //in here describes in more detail how to use the various "contributes" seciton in package.json
  //https://code.visualstudio.com/docs/extensions/example-debuggers

  // TODO: i'm guessing we use "breakpoints" to figure out which filetypes can set breakpoints?
  // e.g. for node2 debug extension we have 'javascript', 'javascriptreact'
  // are we supposed to map these to filetypes? how does it work for transpile to JS filetypes? (TS, etc.)

  // i'm not gonna worry about restricting the setting of breakpoints
  //
  // instead i will do like vscode/visual studio
  // and allow breakpoints to set on any file, but when the debugger
  // starts the breakpoints will turn gray indicating that the breakpoints
  // are not available (were not sent successfully to the debug adapter)

  // TODO: debuggers (are we supposed to add these to a UI user menu?)
  // in vscode you press F5 to start debugging. how do we know which debugger to pick from this list?
  //
  // i think the only thing that is shown in the UI are configs
  // provided by launch.json (using the :name property)
  // otherwise it just shows "No Configurations"?

  // TODO: how does "Start Debug" determine which debug adapter
  // to use? i.e. javascript -> node2

  // so there must be some config or mapping somewhere to know
  // that Start Debug while in a typescript or javascript file
  // will start the "node2" debugger?

  debuggers.forEach((d: any) => availableDebugAdapters.set(d.type, d))

  const ext = require(requirePath)
  if (!ext.activate) return console.log('this debug ext does not have an "activate" method lolwtf??')

  const context = { subscriptions: [] }
  // TODO: ext.activate may not necessarily be an async function. we should probably check this in
  // extensions toooooooo
  ext.activate(context)

  console.log('subs:', context.subscriptions)
}

// TODO: hook it up to worker-client.on event
const startDebuggingSession = (debugType: string) => {
  const adapterId = uuid()
  const adapter = availableDebugAdapters.get(debugType)
  if (!adapter) return console.error(`debug adapter ${debugType} not found`)

  const { label, program, runtime } = adapter
  console.log(`starting debug adapter: ${label}`)

  // TODO: not good enough, we will also need the path of the
  // debug extension. we should probably create this abs path
  // when adding to availableDebugAdapters
  const adapterPath = join(TEMP_EXT_DIR, program)
  const debugAdapterProcess = startDebugAdapter(adapterPath, runtime)
  const adapterConnection = connectDebugAdapter(debugAdapterProcess)
  runningDebugAdapters.set(adapterId, adapterConnection)
  return adapterId
}

const getDebugLaunchConfig = (debugType: string) => {
  // TODO: how does this work?

  // IF LAUNCH.JSON
  // use launch.json provided by user (available in ${cwd}/launch.json?)
  //
  // ELSE
  // extension provides a default config:
  //
  // package.json - "initialConfigurations" [STATIC]
  // - OR -
  // DebugConfigurationProvider func implementation in ext [DYNAMIC]
  //
  // is there every any merging of default config + user config?
  // - YES. see below:

  // If the static nature of debug contributions in the package.json is not
  // sufficient, a DebugConfigurationProvider can be used to dynamically
  // control the following aspects of a debug extension:

  //     - the initial debug configurations for a newly created launch.json can
  //     be generated dynamically, e.g. based on some contextual information
  //     available in the workspace,

  //     - a launch configuration can be 'resolved' (or 'massaged') before it
  //     is used to start a new debug session. This allows for filling in
  //     default values based on information available in the workspace. 

  //     - the executable path for the debug adapter and any command line
  //     arguments passed to it can be dynamically calculated.

}

// OBSERVATIONS OF NODE-DEBUG2 FROM VSCODE:
// i'm not sure if debug2 is stupid or if the documentation is stupid.
//
// apparently debug2 gets loaded AND activated (.activate() func) on the start of a debug session
// EVEN THOUGH there are no activationEvents registered... so i guess it's implicit. also i tried
// starting a debug session on a python file, and it the extension still activated. i'm not sure
// if this was because i lacked any other debuggers installed, or if ALL extensions get activated
// when a debug session starts?
//
// first of all i would expect it to only start with the right activationEvent registered, but
// second of all i would expect the extension to only start if the "contributes" section has an
// entry for the current buffer filetype
//
// also, "provideInitialConfiguration" is never called in debug2. not when activation the extension
// and neither when hitting the "cog wheel" button in vscode to generate a launch.json. i guess
// it does what it says on the label: only providesInitialConfig when the registered command is called.

doTheNeedful().catch(console.error)

on.startDebug(async (adapter: string) => {
  console.log('starting adapter', adapter)
  return startDebuggingSession(adapter)
})
