import { DebugProtocol as DP } from 'vscode-debugprotocol'
import * as extensions from '../core/extensions'
import debugUI from '../components/debugger'
import { objToMap } from '../support/utils'
import { action } from '../core/neovim'

type ThreadsRes = DP.ThreadsResponse['body']
type StackRes = DP.StackTraceResponse['body']
type ScopesRes = DP.ScopesResponse['body']
type VarRes = DP.VariablesResponse['body']

// TODO: when the debugger is stopped, we can change the:
// - threads
// - stacks
// - scopes
//
// we will need some way to hookup this fn to user selecting different
// threads/stacks/scopes/etc.
const getStopInfo = async (dbg: extensions.RPCServer, thread?: number, stack?: number, scope?: number) => {
  console.log('get stop info :: THREAD - STACK - SCOPE', thread, stack, scope)
  // request:
  // 'threads'
  // 'stacktrace'
  // 'scopes'
  // 'variables' .. variables and more and more
  const { threads }: ThreadsRes = await dbg.sendRequest('threads')
  const threadId = thread || threads[0].id
  debugUI.updateState({ threads, activeThread: threadId })

  // TODO: EVERYTIME WE CALL 'stackTrace' and 'scopes' again we get a list of
  // stacks/scopes with different IDs. i think we should be more conservative
  // and only call the stacks/scopes/vars if the parent above changes. e.g.
  // -- if change 'thread' change all below (stacks, scopes, vars)
  // -- if change 'stack' change all below (scopes, vars)
  // -- if change 'scope' change all below (vars)
  // etc...

  const { stackFrames }: StackRes = await dbg.sendRequest('stackTrace', { threadId })
  const frameId = stack || stackFrames[0].id
  debugUI.updateState({ stacks: stackFrames, activeStack: frameId })

  const { scopes }: ScopesRes = await dbg.sendRequest('scopes', { frameId })
  const variablesReference = scope || 1000
  debugUI.updateState({ scopes, activeScope: variablesReference })

  const { variables }: VarRes = await dbg.sendRequest('variables', { variablesReference })
  debugUI.updateState({ variables })

  console.log('------> THREAD - STACK - SCOPE', threadId, frameId, variablesReference)
}

// type Breakpoint = DP.SetBreakpointsRequest['arguments']

// TODO: in the future we will want the ability to have multiple
// debuggers running at the same time (vscode does something like this)


    // setBreakpoints for every source file with breakpoints,
    // setFunctionBreakpoints if the debug adapter supports function breakpoints,
    // setExceptionBreakpoints if the debug adapter supports any exception options,
    // configurationDoneRequest to indicate the end of the configuration sequence.

// const breakpoints = new Map<string, any>()
// const functionBreakpoints = new Map<string, any>()
// const exceptionBreakpoints = new Map<string, any>()

// TODO: this is a dirty hack. need to figure out a better way to contextualize
// the various debuggers in teh UI. someone needs to own the current instance of
// debugger... who will that be?

let activeDBG: extensions.RPCServer
export const userSelectStack = (thread: number, stack: number) => {
  console.log('user select stack', thread, stack)
  getStopInfo(activeDBG, thread, stack)
}

export const userSelectScope = (thread: number, stack: number, scope: number) => {
  console.log('user select scope:', thread, stack, scope)
  getStopInfo(activeDBG, thread, stack, scope)
}

export const start = async (type: string) => {
  console.log('start debugger:', type)

  let activeThreadId = -1
  const features = new Map<string, any>()

  const dbg = await extensions.start.debug(type)
  activeDBG = dbg
  await new Promise(f => setTimeout(f, 1e3))

  action('debug-next', () => dbg.sendRequest('next', { threadId: activeThreadId }))
  action('debug-continue', () => dbg.sendRequest('continue', { threadId: activeThreadId }))

  dbg.onNotification('stopped', async (m: DP.StoppedEvent['body']) => {
    console.log('DEBUGGER STOPPED:', m)
    getStopInfo(dbg, activeThreadId)
  })

  // TODO: this notification is optional
  // if this does not set the active thread, then assign the first thread
  // from 'threads' request/response?
  dbg.onNotification('thread', (m: DP.ThreadEvent['body']) => {
    console.log('THREAD:', m)
    activeThreadId = m.threadId
    // request: 'threads'
  })

  dbg.onNotification('terminated', () => {
    console.log('YOU HAVE BEEN TERMINATED')
  })

  dbg.onNotification('initialized', async () => {
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

    const breakpointsResponse = await dbg.sendRequest('setBreakpoints', breakpointsRequest)
    console.log('BRSK:', breakpointsResponse)
    // TODO: send function breakpoints
    // TODO: send exception breakpoints

    await dbg.sendRequest('configurationDone')
    console.log('CONFIG DONE')
  })

  dbg.onNotification('capabilities', ({ capabilities }) => {
    objToMap(capabilities, features)
  })

  dbg.onNotification('loadedSource', (_m) => {
    // TODO: wat i do wit dis?
  })

  dbg.onNotification('output', data => {
    if (data.category === 'console' || data.category === 'stderr') console.log(type, data.output)
  })

  const initRequest: DP.InitializeRequest['arguments'] = {
    clientID: 'veonim',
    clientName: 'Veonim',
    adapterID: 'node2',
    pathFormat: 'path',
    linesStartAt1: false,
    columnsStartAt1: false,
    locale: 'en',
  }

  const supportedCapabilities = await dbg.sendRequest('initialize', initRequest)
  objToMap(supportedCapabilities, features)

  // TODO: SEE DIS WAT DO? "Instead VS Code passes all arguments from the user's launch configuration to the launch or attach requests"
  const launchRequest = {
    type: 'node2',
    request: 'launch',
    name: 'Launch Program',
    program: '/Users/a/proj/playground/asunc.js',
    cwd: '/Users/a/proj/playground'
  }

  await dbg.sendRequest('launch', launchRequest)

  debugUI.show()

  const threadsResponse: ThreadsRes = await dbg.sendRequest('threads')
  debugUI.updateState({ threads: threadsResponse.threads })

  const [ firstThread ] = threadsResponse.threads
  if (firstThread) activeThreadId = firstThread.id
}
