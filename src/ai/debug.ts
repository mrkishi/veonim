import { action, current as vim, cmd, openFile, lineNumber } from '../core/neovim'
import { DebugAdapterConnection } from '../messaging/debug-protocol'
import { objToMap, uuid, merge, ID } from '../support/utils'
import { DebugProtocol as DP } from 'vscode-debugprotocol'
import userSelectOption from '../components/generic-menu'
import getDebugConfig from '../ai/get-debug-config'
import { debugline, cursor } from '../core/cursor'
import * as extensions from '../core/extensions'
import * as breakpoints from '../ai/breakpoints'
import { getWindow } from '../core/windows'
import debugUI from '../components/debug'
import * as Icon from 'hyperapp-feather'
import { translate } from '../ui/css'

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
  rpc: DebugAdapterConnection
}

interface Position {
  path: string
  line: number
  column: number
}

const tempVimSignsIDGenerator = ID(1)
let activeDebugger = 'lolnope'
const debuggers = new Map<string, Debugger>()

const moveDebugLine = async ({ path, line, column }: Position) => {
  // TODO: need a way to show inline breakpoints. we can get multiple calls
  // for the same path/line, but with different columns. without showing that
  // the column changed in the UI, the user does not know if their actions
  // actually worked
  console.log('NYI: move debugline ++ show COLUMN location', column)
  await openFile(path)

  const canvasWindow = getWindow(cursor.row, cursor.col)
  if (!canvasWindow) return console.error('there is no current window. lolwut?')
  const specs = canvasWindow.getSpecs()

  const topLine = await lineNumber.top()
  const distanceFromTop = line - topLine
  const relativeLine = specs.row + distanceFromTop

  const { x, y, width } = canvasWindow.whereLine(relativeLine)

  merge(debugline.style, {
    background: 'rgba(118, 0, 57, 0.6)',
    display: 'block',
    transform: translate(x, y),
    width: `${width}px`,
  })
}

const Refresher = (dbg: DebugAdapterConnection) => ({
  threads: async () => {
    const { threads } = await dbg.sendRequest<DP.ThreadsResponse>('threads')
    debugUI.updateState({ threads })
    return threads
  },
  stackFrames: async (threadId: number) => {
    const { stackFrames } = await dbg.sendRequest<DP.StackTraceResponse>('stackTrace', { threadId })
    debugUI.updateState({ stackFrames })
    return stackFrames
  },
  scopes: async (frameId: number) => {
    const { scopes } = await dbg.sendRequest<DP.ScopesResponse>('scopes', { frameId })
    debugUI.updateState({ scopes })
    return scopes
  },
  variables: async (variablesReference: number) => {
    const { variables } = await dbg.sendRequest<DP.VariablesResponse>('variables', { variablesReference })
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

const getStackFramePosition = (stackFrame: DP.StackFrame): Position => {
  const { source = {}, line, column } = stackFrame
  // TODO: this might not be the correct property and usage.
  // refer to interface docs on the proper way to get current
  // debug line location
  return { line, column, path: source.path || vim.absoluteFilepath }
}

// TODO: TEMP LOL
const fileToID = new Map()
setTimeout(() => {
  cmd(`sign unplace *`)
  cmd(`sign define vnbp text=» texthl=String`)
}, 1e3)
// TODO: TEMP LOL

// TODO: now that we have these visual signs, we can use the SetBreakpointsResponse
// "verified" rating to change colors of any inactive (not verified) breakpoints
// and visually see them as gray signs in the vim buffer
const addOrRemoveVimSign = (bp: breakpoints.Breakpoint) => {
  if (!fileToID.has(bp.path)) fileToID.set(bp.path, tempVimSignsIDGenerator.next())
  const line = bp.line + 1
  const fileId = fileToID.get(bp.path)
  const signId = `${fileId}${line}`

  breakpoints.has(bp)
    ? cmd(`sign unplace ${signId}`)
    : cmd(`sign place ${signId} name=vnbp line=${line} file=${bp.path}`)
}

const toggleBreakpoint = () => {
  const { absoluteFilepath: path, line, column } = vim
  const breakpoint = { path, line, column, kind: breakpoints.BreakpointKind.Source }

  addOrRemoveVimSign(breakpoint)

  breakpoints.has(breakpoint)
    ? breakpoints.remove(breakpoint)
    : breakpoints.add(breakpoint)

  debugUI.updateState({ breakpoints: breakpoints.list() })
}

const toggleFunctionBreakpoint = () => {
  const { absoluteFilepath: path, line, column } = vim
  const breakpoint = { path, line, column, kind: breakpoints.BreakpointKind.Function }

  addOrRemoveVimSign(breakpoint)

  breakpoints.has(breakpoint)
    ? breakpoints.remove(breakpoint)
    : breakpoints.add(breakpoint)

  debugUI.updateState({ breakpoints: breakpoints.list() })
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

  const chosenStackFrame = dbg.stackFrames.find(sf => sf.id === frameId)
  if (!chosenStackFrame) return console.error('trying to change to a debug stack frame that does not exist')
  moveDebugLine(getStackFramePosition(chosenStackFrame))
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
  if (!dbg) return console.log('no active debugger found to stop')

  dbg.rpc.sendRequest('disconnect')
  debuggers.delete(activeDebugger)

  const [ anotherDebugger ] = [...debuggers.values()]
  if (!anotherDebugger) return debugUI.hide()

  activeDebugger = anotherDebugger.id
  const { rpc, ...debuggerState } = anotherDebugger
  debugUI.updateState({ ...debuggerState, debuggers: listActiveDebuggers() })
}

const start = async (type: string) => {
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

  dbg.rpc.onNotification<DP.StoppedEvent>('stopped', async m => {
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
    const variables = await refresh.variables(scopes[0].variablesReference)

    moveDebugLine(getStackFramePosition(stackFrames[0]))

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
  dbg.rpc.onNotification<DP.ThreadEvent>('thread', m => {
    console.log('THREAD:', m)
    updateDebuggerState(dbg.id, { activeThread: m.threadId })
    // request: 'threads'
  })

  dbg.rpc.onNotification<DP.TerminatedEvent>('terminated', () => {
    console.log('YOU HAVE BEEN TERMINATED')
  })

  dbg.rpc.onNotification<DP.InitializedEvent>('initialized', async () => {
    console.log('INITIALIZED! SEND DA BREAKPOINTS!')
    console.log(features)

    // TODO: find out what the key is that we are looking for. is this typed?
    // (i don't think so)
    const functionBreakpointsSupported = features.has('supportsFunctionBreakpoints')
    const sourceBreakpoints = breakpoints.listSourceBreakpoints()
    const functionBreakpoints = breakpoints.listFunctionBreakpoints()

    // TODO: send function breakpoints
    // TODO: send exception breakpoints
    if (functionBreakpointsSupported) {
      console.warn('NYI: pls sendRequest for function breakpoints to the debug adapter')
      console.log(functionBreakpoints)
    }

    const breakpointsReq = sourceBreakpoints.map(breakpointSource => {
      return dbg.rpc.sendRequest<DP.SetBreakpointsResponse>('setBreakpoints', breakpointSource)
    })

    const breakpointsRes = await Promise.all(breakpointsReq)
    // TODO: the debug adapter will let us know which breakpoints are "verified" as registered
    // with the debugger. we can use this to highlight breakpoints with an active color.
    // or mayve we do like vsc or visual studio. if the breakpoint was not verified when
    // the debugger started, we gray it out to mark it as "inactive"
    console.log('breakpoints verified by the debugger', breakpointsRes)

    await dbg.rpc.sendRequest('configurationDone')
    console.log('CONFIG DONE')
  })

  dbg.rpc.onNotification<DP.CapabilitiesEvent>('capabilities', ({ capabilities }) => {
    objToMap(capabilities, features)
  })

  dbg.rpc.onNotification<DP.LoadedSourceEvent>('loadedSource', (_m) => {
    // TODO: wat i do wit dis?
  })

  dbg.rpc.onNotification<DP.OutputEvent>('output', data => {
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

  const capabilities = await dbg.rpc.sendRequest<DP.InitializeResponse>('initialize', initRequest)
  if (capabilities) objToMap(capabilities, features)

  const launchConfig = {
    ...getDebugConfig(type),
    // TODO: this is the main entry point of the program. may or may not be the current file
    program: vim.absoluteFilepath,
    cwd: vim.cwd,
  }
  await dbg.rpc.sendRequest('launch', launchConfig)
  const { threads } = await dbg.rpc.sendRequest<DP.ThreadsResponse>('threads')

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

// TODO: add action to jump cursor location to currently stopped debug location
// action('debug-jumpto-stopped', jumpToStopped)
action('debug-stop', stop)
action('debug-next', next)
action('debug-continue', continuee)
action('debug-breakpoint', toggleBreakpoint)
action('debug-breakpoint-function', toggleFunctionBreakpoint)
