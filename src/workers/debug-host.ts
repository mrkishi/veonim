import { readFile, fromJSON, uuid } from '../support/utils'
import WorkerClient from '../messaging/worker-client'
import { spawn, ChildProcess } from 'child_process'
import * as rpc from 'vscode-jsonrpc'
import { dirname, join } from 'path'
import '../support/vscode-shim'

// -- REFERENCE LINKS --
// https://github.com/Microsoft/vscode-node-debug2/blob/master/package.json
// https://github.com/Microsoft/vscode-chrome-debug/blob/master/package.json
// https://github.com/Microsoft/vscode-mock-debug/blob/master/package.json
// https://code.visualstudio.com/docs/extensionAPI/api-debugging
// https://code.visualstudio.com/docs/extensions/example-debuggers#_using-a-debugconfigurationprovider

// download extension for dev debug
// vscode:extension/ms-vscode.node-debug2
// https://ms-vscode.gallery.vsassets.io/_apis/public/gallery/publisher/ms-vscode/extension/node-debug2/latest/assetbyname/Microsoft.VisualStudio.Services.VSIXPackage
//

// TODO: once i have figured this out, we will dynamically get these vars with the code
// that already exists in extension-host
const TEMP_EXT_DIR = join(process.cwd(), 'memes', 'extension')
const memeConfig = join(TEMP_EXT_DIR, 'package.json')

const runningDebugAdapters = new Map<string, rpc.MessageConnection>()

const getPackageJsonConfig = async (packageJson: string): Promise<Extension> => {
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

const startDebugAdapter = (debugAdapterPath: string, runtime?: 'node' | 'mono'): ChildProcess => {
  // TODO: do we need to accept any arguments from launch.json config? (whether user provided or generated)
  const spawnOptions = {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
  }

  let proc

  // if a runtime is not provided, then the debug adapter is a binary executable
  if (!runtime) proc = spawn(debugAdapterPath, spawnOptions)
  else if (runtime === 'node') proc = spawn(process.execPath, [debugAdapterPath], spawnOptions)
  // TODO: figure out if vscode comes with mono/installs it? or it depends on it being on the system already
  else if (runtime === 'mono') throw new Error('debug adapter runtime "mono" not supported yet, but it should!')
  else throw new Error(`invalid debug adapter runtime provided: ${runtime}. are we supposed to support this?`)

  proc.stderr.on('data', console.error)
  return proc
}

const connectDebugAdapter = (proc: ChildProcess): string => {
  const adaterId = uuid()

  const reader = new rpc.StreamMessageReader(proc.stdout)
  const writer = new rpc.StreamMessageWriter(proc.stdin)
  const conn = rpc.createMessageConnection(reader, writer)

  conn.listen()

  runningDebugAdapters.set(adaterId, conn)
  return adaterId
}

const doTheNeedful = async () => {
  const { requirePath, activationEvents, contributes } = await getPackageJsonConfig(memeConfig)
  const { breakpoints, debuggers, commands, keybindings, menus } = contributes

  // TODO: how is a debug extension activated???? "activationEvents" and etc.
  // dynamic DebugConfigurationProvider may control this too.
  // read about it here: https://code.visualstudio.com/docs/extensions/example-debuggers#_using-a-debugconfigurationprovider

  //in here describes in more detail how to use the various "contributes" seciton in package.json
  //https://code.visualstudio.com/docs/extensions/example-debuggers

  // TODO: i'm guessing we use "breakpoints" to figure out which filetypes can set breakpoints?
  // e.g. for node2 debug extension we have 'javascript', 'javascriptreact'
  // are we supposed to map these to filetypes? how does it work for transpile to JS filetypes? (TS, etc.)

  // TODO: debuggers (are we supposed to add these to a UI user menu?)
  // in vscode you press F5 to start debugging. how do we know which debugger to pick from this list?

  // console.log('-- CONTRIBUTES --')
  // console.log('BREAKPOINTS:', breakpoints)
  // console.log('DEBUGGERS', debuggers)
  // console.log('COMMANDS:', commands)
  // console.log('KEYBINDINGS', keybindings)
  // console.log('MENUS', menus)
  // console.log('-----------------')

  // TODO: there is something about config the launch.json
  // i think it is possible to either use a user-provided launch.json file
  // - OR -
  // derived from "initalConfigurations" from package.json
  // - OR -
  // a default configuration is computed dynamically by the extension.
  //
  // the "configurationAttributes", "configurationSnippets" from package.json
  // are used to provide intellisense when the user is editing a launch.json
  // file. for MVP i think we can ignore this. it might be an interesting exercise
  // to figure this out, but probably too much effort/usefulness. launch.json
  // only done once per project, possibly often copypasta'd. then we can always
  // launch vscode for normies editing launch.json

  // TODO: "type" is used in user debug config
  //https://code.visualstudio.com/docs/extensions/example-debuggers
  const { label, program, runtime } = debuggers.find(d => d.type === 'node2')
  // TODO: i'm guessing the runtime is what we use to start the debug adapter with?
  // if the runtime is "node" then it's just a simple process.spawn from electron (aka node)
  // what if the runtime is not "node". then what? maybe it's a binary executable? or we
  // call something that exists on the system like python/ruby/etc?
  //
  // from the docs (https://code.visualstudio.com/docs/extensions/example-debuggers):
  // If the program is implemented in a platform independent way, e.g. as program
  // that runs on a runtime that is available on all supported platforms, you
  // can specify this runtime via the runtime attribute. As of today, VS Code
  // supports node and mono runtimes. Our Mock Debug adapter from above uses
  // this approach.
  //
  // ok so this means at the time of the writing of the doc there are 3 different types to start
  // a debug adapter: 'node', 'mono', or binary executable.
  //
  // by the way, different platforms may require different executables. see the docs
  // for example combinations of program/runtime

  // TODO: i wonder how vscode starts "mono" debug adapters. does vscode ship with
  // a "mono" runtime? or do they assume it exists on the filesystem?
  //
  //
  //https://code.visualstudio.com/docs/extensionAPI/api-debugging
  // from the vscode docs:
  //A Debug Adapter is typically a standalone executable that talks to a real
  //debugger and translates between the Debug Adapter Protocol and the concrete
  //protocol or API of the debugger. Since a debug adapter can be implemented
  //in the language that is best suited for a given debugger or runtime, the
  //wire protocol is more important than the API of a particular client library
  //that implements that protocol.
  //
  // the way i understand this is that we are given an executable and we just gotta run
  // with it and start it up. i'm still confused why we have to start it up, and why
  // does the extension not start it up like it does in LSP extensions.
  //
  // i guess we start the debug adater ourselves. from the vscode docs:
  //Since a debug adapter is not a VS Code extension by itself, it is wrapped
  //as an Debugger Extension, but this does not need to contribute any
  //additional code. This extension is just used as a "container" that provides
  //the necessary contributions in the package.json. When a debug session is
  //started, VS Code "reaches" into the debugger extension, starts the debug
  //adapter, and then communicates with it by using the debug adapter protocol.

  console.log('starting debugger', label)
  const debuggerPath = join(TEMP_EXT_DIR, program)
  console.log('debuggerPath', debuggerPath)

  const debugAdapterProcess = startDebugAdapter(debuggerPath, runtime)
  const adapterId = connectDebugAdapter(debugAdapterProcess)

  // TODO: figure out how to determine:
  // - when debug adapters are supposed to be started
  // - how to "get" and "route" debug requests to the correct debug adapter
  const testingAdapter = runningDebugAdapters.get(adapterId)
  console.log('testing debug adapter', adapterId, testingAdapter)
  // TODO: figure out the protocol and what we need to send for init and etc.
  // testingAdapter.sendNotification(...)

  // TODO: so in the case of this node2 debugger extension, the only thing that the extension
  // does is dynamically setup a launch.json configuration? aka when the debug adapter is supposed
  // to be started...
  const ext = require(requirePath)
  if (!ext.activate) return console.log('this debug ext does not have an "activate" method lolwtf??')

  const context = { subscriptions: [] }
  // TODO: ext.activate may not necessarily be an async function. we should probably check this in
  // extensions toooooooo
  ext.activate(context)

  console.log('subs:', context.subscriptions)
}

doTheNeedful().catch(console.error)
