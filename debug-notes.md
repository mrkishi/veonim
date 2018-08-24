# debug notes lol

## todo
- handle termination of debugger - from debugger
- handle termination of debugger - by user
- when loading extensions, if a value starts and ends with %, this means that
  it's an i18n and we need to parse package.nls.json to get the actual english
  text value
- investigate vsvode extension dependencies (node-debug depends on node-debug2)
  - this may be why node-debug2 has nothing to provide configuration to the
    ext host. (maybe node-debug has it instead?)
- sometimes on 'stopped' event we request the stackTraces, we get an error that no
  stack traces are available. why? is this normal? should we expect it and handle
  gracefully somehow?

- create UI for debug controls (like teh debug bar with buttons in vsc)

- how do we implement the debug console?
- how do we do debugger hover show value of variable on cursor position
- figure out LaunchRequest parameters for 'launch' req. this comes from launch.json configs. see musings about getting launch configs from extension config

- can we do 'watch' expressions? how do these work? on every breakpoint stop?
- create a master list of 'breakpoints'

- remember to remove commented out .show-cursor css class

## keep in mind
- extensionDepencies also need to be installed. this means we need to have downloader
  download, extract, and install any extensionDependencies found in package.json.
  this complicates things a bit...
  - i think for first round we will skip this functionality, and the user will be responsible
    for defining and installing them via vimscript

## wishlist
- would like to track debug history. at every breakpoint, save breakpoint info
  threads/stacks/scopes/variables
- would like some sort of easy/automatic way of simplying knowing a variables
  value thru the runtime of the program/function. right now i do console.log
  but it would be neat if we could do this with conditional breakpoints/log BPs
  and debug history to know value of variables thru some sort of log (inspire redux)
  - i think this is called 'log points' and is supported by the debug protocol
    (but maybe not every debugger)

## REFERENCE LINKS
https://github.com/Microsoft/vscode-node-debug2/blob/master/package.json
https://github.com/Microsoft/vscode-chrome-debug/blob/master/package.json
https://github.com/Microsoft/vscode-mock-debug/blob/master/package.json
https://code.visualstudio.com/docs/extensionAPI/api-debugging
https://code.visualstudio.com/docs/extensions/example-debuggers

## testing config
add extension to init.vim

```vim
VeonimExt 'vscode:extension/ms-vscode.node-debug2'
VeonimExt 'vscode:extension/ms-vscode.node-debug'
```

## observations
- yeap so we can start the node-debug2 when we provide the correct request
  arguments to 'launch' request (this is the info we would typically get
  from launch.json). right now the launch config is hardcoded, but we need
  to figure out how to get the configs from the extension.
  - node-debug2 does not provide any launch configs, but it is a dependency
    of node-debug, so i wonder if we are supposed to receive the launch config
    from node-debug instead

## activation
COMMANDS
what do we use the provided commands for? are they always user-triggered
or does vscode ever call them?

ACTIVATION EVENTS
TODO: how is a debug extension activated???? "activationEvents" and etc.
dynamic DebugConfigurationProvider may control this too.
read about it here: https://code.visualstudio.com/docs/extensions/example-debuggers#_using-a-debugconfigurationprovider

activationEvents used for debugging purposes
"onDebug" - triggered as soon as any debug functionality is used

TODO: where is DebugConfigurationProvider called and how are these
events related to it?

"onDebugInitialConfigurations" - is fired just before the
'provideDebugConfigurations' method of the 'DebugConfigurationProvider' is
called. (wut?)

"onDebugResolve:${type}" - is fired just before the
'resolveDebugConfiguration' method of the 'DebugConfigurationProvider' for
the specified type is called. (wut?)

some example activationEvents (command events excluded)
- mock-debug -> onDebug
- node-debug -> onDebugInitialConfigurations, onDebugResolve:node
- chrome-debug -> onDebugInitialConfigurations, onDebugResolve:chrome
- node-debug2 -> nothing, only a command... wat... how does this start?
   - maybe because it's builtin to vscode the startup is hardcoded?
- mono-debug -> nothing, only a command... wat??
   - perhaps there is no auto start with mono. readme does not specify
     anything about auto-start. it says either use cmdline flags or launch.json

ok so first of all the debugger is initiated via user action.
an extension may provide some default config for the debug adapter
in which case it may have some activationEvents (but which?)
also, keep in mind that some "debugger extensions" come bundled
with other stuff like a general language extension (go, pythong, etc.)
 - lsp stuff (but not lsp), debugging, linting, building, etc.

in here describes in more detail how to use the various "contributes" seciton in package.json
https://code.visualstudio.com/docs/extensions/example-debuggers

TODO: i'm guessing we use "breakpoints" to figure out which filetypes can set breakpoints?
e.g. for node2 debug extension we have 'javascript', 'javascriptreact'
are we supposed to map these to filetypes? how does it work for transpile to JS filetypes? (TS, etc.)

i'm not gonna worry about restricting the setting of breakpoints

instead i will do like vscode/visual studio
and allow breakpoints to set on any file, but when the debugger
starts the breakpoints will turn gray indicating that the breakpoints
are not available (were not sent successfully to the debug adapter)

TODO: debuggers (are we supposed to add these to a UI user menu?)
in vscode you press F5 to start debugging. how do we know which debugger to pick from this list?

i think the only thing that is shown in the UI are configs
provided by launch.json (using the :name property)
otherwise it just shows "No Configurations"?

TODO: how does "Start Debug" determine which debug adapter
to use? i.e. javascript -> node2

VSCODE SHOWS A MENU WHERE YOU CAN PICK THE DEBUGGER (chrome, node.js, etc.)

so there must be some config or mapping somewhere to know
that Start Debug while in a typescript or javascript file
will start the "node2" debugger?

## cultural learnings...
- yeah so node2 does not get loaded as an option in the UI and it does not provide any config.
  this appears to be intentional. i found some references in the vsc src that indicate that
  node2 is not used directly. i think this makes sense now because...

  node-debug has an extensionDependency on node-debug2
  node-debug has all the activation events and provides configuration for both
  debugger types 'node' and 'node2'

  it seems like we are only supposed to activate node-debug and it will provide
  configuration and let us know if we should start node-debug or node-debug2 adapters

- therefore: i think we use the extensions to load all debug adapters.
  HOWEVER! even though an extension provides a debug adapter, it does not mean that
  the extension will be activated, provide launch config, or provide an option to the UI

- so the question remains, how do we determine what debuggers to list in the UI.
  i installed a bunch of debuggers and looked at the pattersn between them. i think the answer
  is that a debugger must provide a "languages" array to show up as an option in the UI.
  otherwise you can only launch it via launch.json "type" property

  (extension package.json "contributes.debuggers[n].languages")

  - would be nice to verify that this is the case. the results for "languages" arr ('x' does not appear in vscode select debugger menu):
    x node-debug2: no "languages" list
    - node-debug: [js, ts, react]
    - chrome-debug: [js, ts, react]
    - java-debug: [java]
    - go: [go]
    - user/lua: [lua]
    - mock-debug: no "languages" list (still appears tho... hmmmmmm wat?)
    - mono-debug: no "languages" list (still appears...)
    - code-debug (Native Debug): no "languages" list
    - perl: [perl]
    - php: no "languages" list

  - maybe extension dependencies do not get added to select debugger menu?
    - what about extension packs (check debugger extension packs - if exists)?

  found in the schema: this could  be interestin
	description: nls.localize('vscode.extension.contributes.debuggers.languages', "List of languages for which the debug extension could be considered the \"default debugger\"."),

  maybe if there are a list of languages, then this specific debugger becomes
  the "default debugger". meaning, if there are any other debuggers they
  somehow are lower priority... but by what criteria? node-debug2 has no
  language definitions... is it because it's an ext dep?

## launch config
IF LAUNCH.JSON
use launch.json provided by user (available in ${cwd}/launch.json?)

ELSE
extension provides a default config:

package.json - "initialConfigurations" [STATIC]
   - OR -
       DebugConfigurationProvider func implementation in ext [DYNAMIC]

       is there every any merging of default config + user config?
   - YES. see below:

       If the static nature of debug contributions in the package.json is not
       sufficient, a DebugConfigurationProvider can be used to dynamically
       control the following aspects of a debug extension:

       - the initial debug configurations for a newly created launch.json can
           be generated dynamically, e.g. based on some contextual information
           available in the workspace,

       - a launch configuration can be 'resolved' (or 'massaged') before it
           is used to start a new debug session. This allows for filling in
           default values based on information available in the workspace. 

       - the executable path for the debug adapter and any command line
           arguments passed to it can be dynamically calculated.

## stupid
OBSERVATIONS OF NODE-DEBUG2 FROM VSCODE:
i'm not sure if debug2 is stupid or if the documentation is stupid.

apparently debug2 gets loaded AND activated (.activate() func) on the start of a debug session
EVEN THOUGH there are no activationEvents registered... so i guess it's implicit. also i tried
starting a debug session on a python file, and it the extension still activated. i'm not sure
if this was because i lacked any other debuggers installed, or if ALL extensions get activated
when a debug session starts?

first of all i would expect it to only start with the right activationEvent registered, but
second of all i would expect the extension to only start if the "contributes" section has an
entry for the current buffer filetype

also, "provideInitialConfiguration" is never called in debug2. not when activation the extension
and neither when hitting the "cog wheel" button in vscode to generate a launch.json. i guess
it does what it says on the label: only providesInitialConfig when the registered command is called.

## vsc source logic analysis
```
class Debugger {
  hasInitialConfiguration(): boolean
    return !!extension.contributes.debuggers[n].initialConfigurations

  hasConfigurationProvider()
    check if provider contributes "provideDebugConfiguration" method
}


startDebugging()
  type = null
  launchConfig = null

  if (!launch.json exists)
    get launch.json configurations
    launchConfig = prompt user for config to use
    type = config.type

  await activate extensions 'onDebug'

  if (!type)
    type = guessDebugger()

  defaultConfig = await resolveConfigurationByProviders(type)

  // launchConfig and defaultConfig get merged together?
  startDebugAdapter(type, launchConfig, defaultConfig)
    

guessDebugger()
  await activate extensions 'onDebugInitialConfigurations'
  await activate extensions 'onDebug'

  // first round checks to see if there are any debuggers for the current editor language
  // i'm not sure this was working for me, since i received debugger options for more
  // languages than the current editor (java, go, python, etc.)

  candidates = debuggers.filter(d => d.hasInitialConfiguration() || a.hasConfigurationProvider)
  return prompt user for debugger to use(candidates)


resolveConfigurationByProviders(type
  await activate extensions `onDebugResolve:${type}`
  // if any extensions have the resolve debug config method
  // registered then we call it to get the config?
  // in vscode src it says "providers". not sure what that means
  extensions.filter(e => e.resolveDebugConfiguration)
  return extensions.map(e => e.resolveDebugConfiguration())
```

## observations: activation-events
vscode-node-debug
- onDebugInitialConfigurations
- onDebugResolve:node

vscode-node-debug2
. (is an ext-dependency for vscode-node-debug)

vscode-go
- onDebugResolve:go

vscode-chrome-debug
- onDebugInitialConfigurations
- onDebugResolve:chrome

vscode-mono-debug
. (does have "initialConfigurations")

felixfbecker/vscode-php-debug
. (does have "initialConfigurations")

raix/vscode-perl-debug
. (does have "initialConfigurations")

actboy168/vscode-lua-debug
- onDebugInitialConfigurations
- onDebugResolve:lua

Microsoft/vscode-java-debug
- onDebugInitialConfigurations
- onDebugResolve:java

WebFreak001/code-debug
. ( does have "initialConfigurations" )

rogalmic/vscode-bash-debug
- onDebug
+ "initialConfigurations" obj

Microsoft/vscode-python
- onDebugResolve:python
+ "initialConfigurations" obj
