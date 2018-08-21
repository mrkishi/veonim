import { DebugProtocol as DP } from 'vscode-debugprotocol'
import { objToMap, uuid, merge } from '../support/utils'
import { action, current as vim } from '../core/neovim'
import getDebugConfig from '../ai/get-debug-config'
import * as extensions from '../core/extensions'
import * as breakpoints from '../ai/breakpoints'
import { RPCServer } from '../core/extensions'
import debugUI from '../components/debugger'
import { join } from 'path'

// TODO: FOR TESTING ONLY
// TODO: FOR TESTING ONLY
// TODO: FOR TESTING ONLY
// TODO: FOR TESTING ONLY
// TODO: FOR TESTING ONLY
debugUI.show()
// TODO: FOR TESTING ONLY
// TODO: FOR TESTING ONLY
// TODO: FOR TESTING ONLY
// TODO: FOR TESTING ONLY

// type Breakpoint = DP.SetBreakpointsRequest['arguments']

    // setBreakpoints for every source file with breakpoints,
    // setFunctionBreakpoints if the debug adapter supports function breakpoints,
    // setExceptionBreakpoints if the debug adapter supports any exception options,
    // configurationDoneRequest to indicate the end of the configuration sequence.

// const breakpoints = new Map<string, any>()
// const functionBreakpoints = new Map<string, any>()
// const exceptionBreakpoints = new Map<string, any>()

type ThreadsRes = DP.ThreadsResponse['body']
type StackRes = DP.StackTraceResponse['body']
type ScopesRes = DP.ScopesResponse['body']
type VarRes = DP.VariablesResponse['body']
type Threads = DP.Thread[]
type StackFrames = DP.StackFrame[]
type Scopes = DP.Scope[]
type Variables = DP.Variable[]

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

const toggleSourceBreakpoint = () => {
  const { absoluteFilepath: path, file: name, line, column } = vim
  const breakpoint = { path, name, line, column, kind: breakpoints.BreakpointKind.Source }

  breakpoints.has(breakpoint)
    ? breakpoints.remove(breakpoint)
    : breakpoints.add(breakpoint)
}

const toggleFunctionBreakpoint = () => {
  const { absoluteFilepath: path, file: name, line, column } = vim
  const breakpoint = { path, name, line, column, kind: breakpoints.BreakpointKind.Function }

  breakpoints.has(breakpoint)
    ? breakpoints.remove(breakpoint)
    : breakpoints.add(breakpoint)
}

// TODO: exception breakpoints??

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

export const start = async (type: string) => {
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

  const features = new Map<string, any>()
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

    await refresh.threads()
    const stackFrames = await refresh.stackFrames(targetThread)
    const scopes = await refresh.scopes(stackFrames[0].id)
    await refresh.variables(scopes[0].variablesReference)

    debugUI.updateState({
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

    // TODO: need to call this request once per source!
    // multiple sources == multiple calls
    const breakpointsRequest: DP.SetBreakpointsRequest['arguments'] = {
      source: {
        name: 'asunc.js',
        path: '/Users/a/proj/playground/asunc.js',
      },
      breakpoints: [
        // TODO: support the other thingies (see interface for other options)
        { line: 10 }
      ]
    }

    const breakpointsResponse = await dbg.rpc.sendRequest('setBreakpoints', breakpointsRequest)
    console.log('BRSK:', breakpointsResponse)
    // TODO: send function breakpoints
    // TODO: send exception breakpoints

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

  await dbg.rpc.sendRequest('launch', getDebugConfig(type))
  const { threads }: ThreadsRes = await dbg.rpc.sendRequest('threads')

  merge(dbg, {
    threads,
    activeThread: (threads[0] || {}).id || -1,
  })

  updateDebuggerState(dbg.id, dbg)
  activeDebugger = dbg.id
}

action('debug-next', next)
action('debug-continue', continuee)
action('debug-breakpoint-source', toggleSourceBreakpoint)
action('debug-breakpoint-function', toggleFunctionBreakpoint)
