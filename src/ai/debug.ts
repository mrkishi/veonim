import { DebugProtocol as DP } from 'vscode-debugprotocol'
import userSelectOption from '../components/generic-menu'
import { objToMap, uuid, merge } from '../support/utils'
import { action, current as vim } from '../core/neovim'
import getDebugConfig from '../ai/get-debug-config'
import * as extensions from '../core/extensions'
import * as breakpoints from '../ai/breakpoints'
import { RPCServer } from '../core/extensions'
import debugUI from '../components/debug'
import * as Icon from 'hyperapp-feather'

type ThreadsRes = DP.ThreadsResponse['body']
type StackRes = DP.StackTraceResponse['body']
type ScopesRes = DP.ScopesResponse['body']
type VarRes = DP.VariablesResponse['body']
type Threads = DP.Thread[]
type StackFrames = DP.StackFrame[]
type Scopes = DP.Scope[]
type Variables = DP.Variable[]
type PossibleDebuggerFeatures = string
  | 'exceptionBreakpointFilters'
  | 'supportsConfigurationDoneRequest'
  | 'supportsSetVariable'
  | 'supportsConditionalBreakpoints'
  | 'supportsCompletionsRequest'
  | 'supportsHitConditionalBreakpoints'
  | 'supportsRestartFrame'
  | 'supportsExceptionInfoRequest'
  | 'supportsDelayedStackTraceLoading'
  | 'supportsValueFormattingOptions'
  | 'supportsEvaluateForHovers'
  | 'supportsLoadedSourcesRequest'
  | 'supportsLogPoints'
  | 'supportsTerminateRequest'
  | 'supportsStepBack'

export interface DebuggerInfo {
  id: string
  type: string
}

interface DebuggerState extends DebuggerInfo {
  activeThread: number
  activeStack: number
  activeScope: number
  threads: Threads
  stackFrames: StackFrames
  scopes: Scopes
  variables: Variables
}

interface Debugger extends DebuggerState {
  rpc: RPCServer
}

let activeDebugger = 'lolnope'
const debuggers = new Map<string, Debugger>()

const Refresher = (dbg: extensions.RPCServer) => ({
  threads: async () => {
    const { threads }: ThreadsRes = await dbg.sendRequest('threads')
    debugUI.updateState({ threads })
    return threads
  },
  stackFrames: async (threadId: number) => {
    const { stackFrames }: StackRes = await dbg.sendRequest('stackTrace', { threadId })
    debugUI.updateState({ stackFrames })
    return stackFrames
  },
  scopes: async (frameId: number) => {
    const { scopes }: ScopesRes = await dbg.sendRequest('scopes', { frameId })
    debugUI.updateState({ scopes })
    return scopes
  },
  variables: async (variablesReference: number) => {
    const { variables }: VarRes = await dbg.sendRequest('variables', { variablesReference })
    debugUI.updateState({ variables })
    return variables
  },
})

const listActiveDebuggers = () => [...debuggers.values()].map(d => ({
  id: d.id,
  type: d.type,
}))

const continuee = () => {
  const dbg = debuggers.get(activeDebugger)
  if (!dbg) return console.warn('debug continue called without an active debugger')
  dbg.rpc.sendRequest('continue', { threadId: dbg.activeThread })
}

const next = () => {
  const dbg = debuggers.get(activeDebugger)
  if (!dbg) return console.warn('debug next called without an active debugger')
  dbg.rpc.sendRequest('next', { threadId: dbg.activeThread })
}

const toggleBreakpoint = () => {
  const { absoluteFilepath: path, line, column } = vim
  const breakpoint = { path, line, column, kind: breakpoints.BreakpointKind.Source }

  breakpoints.has(breakpoint)
    ? breakpoints.remove(breakpoint)
    : breakpoints.add(breakpoint)

  debugUI.updateState({ breakpoints: breakpoints.list() })

  // TODO: ONLY FOR DEV BECAUSE WE ARE NOT MARKING THEM IN THE EDITOR JUST YET
  debugUI.show()
  // TODO: ONLY FOR DEV BECAUSE WE ARE NOT MARKING THEM IN THE EDITOR JUST YET
}

const toggleFunctionBreakpoint = () => {
  const { absoluteFilepath: path, line, column } = vim
  const breakpoint = { path, line, column, kind: breakpoints.BreakpointKind.Function }

  breakpoints.has(breakpoint)
    ? breakpoints.remove(breakpoint)
    : breakpoints.add(breakpoint)

  debugUI.updateState({ breakpoints: breakpoints.list() })

  // TODO: ONLY FOR DEV BECAUSE WE ARE NOT MARKING THEM IN THE EDITOR JUST YET
  debugUI.show()
  // TODO: ONLY FOR DEV BECAUSE WE ARE NOT MARKING THEM IN THE EDITOR JUST YET
}

// TODO: what about exception breakpoints?? i think this is just a boolean
// on/off. like in chrome devtools, you just specify if you want the debugger
// to stop on exceptions. there is no "setting" of breakpoints in the source

export const switchActiveDebugger = (id: string) => {
  if (!debuggers.has(id)) return false
  activeDebugger = id
  const { rpc, ...debuggerState } = debuggers.get(id)!
  debugUI.updateState(debuggerState)
  return true
}

export const changeStack = async (frameId: number) => {
  const dbg = debuggers.get(activeDebugger)
  if (!dbg) return console.error('no active debugger found. this is a problem because we already have the debug context present in the UI')

  const refresh = Refresher(dbg.rpc)
  const scopes = await refresh.scopes(frameId)
  const variables = await refresh.variables(scopes[0].variablesReference)

  updateDebuggerState(activeDebugger, {
    scopes,
    variables,
    activeStack: frameId,
    activeScope: scopes[0].variablesReference,
  })
}

export const changeScope = async (variablesReference: number) => {
  const dbg = debuggers.get(activeDebugger)
  if (!dbg) return console.error('no active debugger found. this is a problem because we already have the debug context present in the UI')

  const refresh = Refresher(dbg.rpc)
  const variables = await refresh.variables(variablesReference)

  updateDebuggerState(activeDebugger, {
    variables,
    activeScope: variablesReference,
  })
}

const updateDebuggerState = (id: string, state: Partial<Debugger>) => {
  const dbg = debuggers.get(id) || {} as Debugger

  const { rpc, ...next } = merge(dbg, state)
  debuggers.set(id, { rpc, ...next })

  if (id !== activeDebugger) return
  debugUI.updateState({ ...next, debuggers: listActiveDebuggers() })
}

const stop = async () => {
  const dbg = debuggers.get(activeDebugger)
  if (!dbg) return console.warn('no active debugger found to stop')

  // TODO: figure out the termination sequence
  dbg.rpc.sendNotification('terminate')
  debuggers.delete(activeDebugger)
}

const start = async (type: string) => {
  console.warn(`starting debugger: ${type}`)

  const dbg: Debugger = {
    type,
    id: uuid(),
    activeThread: -1,
    activeStack: -1,
    activeScope: -1,
    threads: [],
    stackFrames: [],
    scopes: [],
    variables: [],
    rpc: await extensions.start.debug(type),
  }

  // TODO: should features and refresh be stored on the debugger object?
  const features = new Map<PossibleDebuggerFeatures, any>()
  const refresh = Refresher(dbg.rpc)

  dbg.rpc.onNotification('stopped', async (m: DP.StoppedEvent['body']) => {
    // TODO: i think on this notification we SOMETIMES get 'threadId'
    // how do we use 'activeThread'???

    // how does it work in VSCode when the user selects a different thread?
    // i don't think it makes any difference in the stopped breakpoints???
    // 
    // i guess i'm a noob at debuggers - not sure how you can switch between
    // threads on a breakpoint. isn't a breakpoint per thread??
    console.log('DEBUGGER STOPPED:', m)
    // TODO: do something with breakpoint 'reason'
    const targetThread = m.threadId || dbg.activeThread

    // TODO: from the stackFrames we can get the current breakpoint
    // source path, line, and column. we should jumpTo that location
    // in the buffer, and show a cursorline highlight for current debug
    // location
    //
    // do the same thing when we change stackFrames from the UI

    // TODO: since our UI shadow buffer layer is buggy, maybe we can use
    // vim signs feature to temporarily show where the breakpoints are
    // in the buffer. kthx

    await refresh.threads()
    const stackFrames = await refresh.stackFrames(targetThread)
    const scopes = await refresh.scopes(stackFrames[0].id)
    const variables = await refresh.variables(scopes[0].variablesReference)

    updateDebuggerState(dbg.id, {
      scopes,
      variables,
      stackFrames,
      activeThread: targetThread,
      activeStack: stackFrames[0].id,
      activeScope: scopes[0].variablesReference,
    })
  })

  // TODO: this notification is optional
  // if this does not set the active thread, then assign the first thread
  // from 'threads' request/response?
  dbg.rpc.onNotification('thread', (m: DP.ThreadEvent['body']) => {
    console.log('THREAD:', m)
    updateDebuggerState(dbg.id, { activeThread: m.threadId })
    // request: 'threads'
  })

  dbg.rpc.onNotification('terminated', () => {
    console.log('YOU HAVE BEEN TERMINATED')
  })

  dbg.rpc.onNotification('initialized', async () => {
    console.log('INITIALIZED! SEND DA BREAKPOINTS!')
    console.log(features)

    // TODO: find out what the key is that we are looking for. is this typed?
    // (i don't think so)
    const functionBreakpointsSupported = features.has('functionBreakpoints')
    const sourceBreakpoints = breakpoints.listSourceBreakpoints()
    const functionBreakpoints = breakpoints.listFunctionBreakpoints()

    // TODO: send function breakpoints
    // TODO: send exception breakpoints
    if (functionBreakpointsSupported) {
      console.warn('NYI: pls sendRequest for function breakpoints to the debug adapter')
      console.log(functionBreakpoints)
    }

    const breakpointsReq = sourceBreakpoints.map(breakpointSource => {
      return dbg.rpc.sendRequest('setBreakpoints', breakpointSource)
    })

    const breakpointsRes: DP.SetBreakpointsResponse['body'][] = await Promise.all(breakpointsReq)
    // TODO: the debug adapter will let us know which breakpoints are "verified" as registered
    // with the debugger. we can use this to highlight breakpoints with an active color.
    // or mayve we do like vsc or visual studio. if the breakpoint was not verified when
    // the debugger started, we gray it out to mark it as "inactive"
    console.log('breakpoints verified by the debugger', breakpointsRes)

    await dbg.rpc.sendRequest('configurationDone')
    console.log('CONFIG DONE')
  })

  dbg.rpc.onNotification('capabilities', ({ capabilities }) => {
    objToMap(capabilities, features)
  })

  dbg.rpc.onNotification('loadedSource', (_m) => {
    // TODO: wat i do wit dis?
  })

  dbg.rpc.onNotification('output', data => {
    if (data.category === 'console' || data.category === 'stderr') console.log(type, data.output)
  })

  const initRequest: DP.InitializeRequest['arguments'] = {
    adapterID: type,
    clientID: 'veonim',
    clientName: 'Veonim',
    linesStartAt1: false,
    columnsStartAt1: false,
    pathFormat: 'path',
    locale: 'en',
  }

  const supportedCapabilities = await dbg.rpc.sendRequest('initialize', initRequest)
  // TODO: what do with DEEZ capabilities??
  // use capabilities to determine what kind of breakpoints to send, etc.
  // for example: log breakpoints that are not supported by all debuggers
  objToMap(supportedCapabilities, features)

  const launchConfig = {
    ...getDebugConfig(type),
    // TODO: this is the main entry point of the program. may or may not be the current file
    program: vim.absoluteFilepath,
    cwd: vim.cwd,
  }
  await dbg.rpc.sendRequest('launch', launchConfig)
  const { threads }: ThreadsRes = await dbg.rpc.sendRequest('threads')

  merge(dbg, {
    threads,
    activeThread: (threads[0] || {}).id || -1,
  })

  updateDebuggerState(dbg.id, dbg)
  activeDebugger = dbg.id
  debugUI.show()
}

action('debug-start', async (type?: string) => {
  if (type) return start(type)

  const availableDebuggers = await extensions.listDebuggers()
  const debuggerOptions = availableDebuggers.map((d: any) => ({
    key: d.type,
    value: d.label,
  }))

  const selectedDebugger = await userSelectOption<string>({
    description: 'choose a debugger to start',
    options: debuggerOptions,
    icon: Icon.Cpu,
  })

  start(selectedDebugger)
})

action('debug-stop', stop)
action('debug-next', next)
action('debug-continue', continuee)
action('debug-breakpoint', toggleBreakpoint)
action('debug-breakpoint-function', toggleFunctionBreakpoint)
