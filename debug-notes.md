# debug notes lol

## todo
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
- show breakpoints in buffer
- show current STOPPED breakpoint in buffer
- jump to relevant file and position when breakpoint hit
- jump to relevant file and position when stack frame changes

- figure out who owns the multiple debugger instances
  - get rid of global activeDBG variable
  - maybe UI should not own any of the state (stacks, scopes, threads, activeStack, activeScope, etc.) because when we change current debugger we need to refresh UI.

- how do we implement the debug console?
- how do we do debugger hover show value of variable on cursor position
- figure out LaunchRequest parameters for 'launch' req. this comes from launch.json configs. see musings about getting launch configs from extension config

- can we do 'watch' expressions? how do these work? on every breakpoint stop?
- create a master list of 'breakpoints'

- remember to remove commented out .show-cursor css class

## wishlist
- would like to track debug history. at every breakpoint, save breakpoint info
  threads/stacks/scopes/variables
- would like some sort of easy/automatic way of simplying knowing a variables
  value thru the runtime of the program/function. right now i do console.log
  but it would be neat if we could do this with conditional breakpoints/log BPs
  and debug history to know value of variables thru some sort of log (inspire redux)

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

so there must be some config or mapping somewhere to know
that Start Debug while in a typescript or javascript file
will start the "node2" debugger?

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
