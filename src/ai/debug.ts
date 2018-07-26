import { DebugProtocol as DP } from 'vscode-debugprotocol'
import * as extensions from '../core/extensions'
import { objToMap } from '../support/utils'

type ThreadsRes = DP.ThreadsResponse['body']
type StackRes = DP.ThreadsResponse['body']
type ScopesRes = DP.ScopesResponse['body']
type VarRes = DP.VariablesResponse['body']

// type Breakpoint = DP.SetBreakpointsRequest['arguments']

// TODO: in the future we will want the ability to have multiple
// debuggers running at the same time (vscode does something like this)
let dbg = {} as extensions.RPCServer

    // setBreakpoints for every source file with breakpoints,
    // setFunctionBreakpoints if the debug adapter supports function breakpoints,
    // setExceptionBreakpoints if the debug adapter supports any exception options,
    // configurationDoneRequest to indicate the end of the configuration sequence.

// const breakpoints = new Map<string, any>()
// const functionBreakpoints = new Map<string, any>()
// const exceptionBreakpoints = new Map<string, any>()

export const start = async (type: string) => {
  console.log('start debugger:', type)

  let activeThreadId = -1
  const threads = new Map<number, string>()
  const features = new Map<string, any>()

  dbg = await extensions.start.debug(type)
  await new Promise(f => setTimeout(f, 1e3))

  dbg.onNotification('stopped', async (m: DP.StoppedEvent['body']) => {
    console.log('DEBUGGER STOPPED:', m)
    const threads: ThreadsRes = await dbg.sendRequest('threads')
    console.log('threads', threads)

    const stack: StackRes = await dbg.sendRequest('stackTrace', { threadId: 1 }).catch(console.error)
    console.log('stack', stack)

    const scopes: ScopesRes = await dbg.sendRequest('scopes', { frameId: 1000 }).catch(console.error)
    console.log('scopes', scopes)

    const variables: VarRes = await dbg.sendRequest('variables', { variablesReference: 1000 }).catch(console.error)
    console.log('variables', variables)

    // request:
    // 'threads'
    // 'stacktrace'
    // 'scopes'
    // 'variables' .. variables and more and more
  })

  // TODO: this notification is optional
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

    setTimeout(async () => {
      console.log('the active thread is:', activeThreadId)

      const next1 = await dbg.sendRequest('next', {threadId: 1 })
      console.log('next1', next1)

      const cont1 = await dbg.sendRequest('continue', { threadId: 1 })
      console.log('cont1', cont1)
    }, 1e3)
  })

  dbg.onNotification('capabilities', ({ capabilities }) => {
    objToMap(capabilities, features)
  })

  dbg.onNotification('loadedSource', m => {
    // TODO: wat i do wit dis?
    // console.log('loadedSource:', m)
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

  const threadsResponse: DP.ThreadsResponse['body'] = await dbg.sendRequest('threads')
  Object.values(threadsResponse.threads).forEach(({ id, name }) => threads.set(id, name))
  console.log('initial threads:', threads)
}
