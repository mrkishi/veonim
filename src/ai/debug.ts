import { DebugProtocol as DP } from 'vscode-debugprotocol'
import * as extensions from '../core/extensions'
import { uuid } from '../support/utils'

// TODO: in the future we will want the ability to have multiple
// debuggers running at the same time (vscode does something like this)
let activeDebugger = {} as extensions.RPCServer

export const start = async (type: string) => {
  console.log('start:', type)
  activeDebugger = await extensions.start.debug(type)
  await new Promise(f => setTimeout(f, 1e3))
  console.log('activeDebugger', activeDebugger)

  activeDebugger.onNotification('initialize', () => {
    console.log('debugger is initialized yo')
  })


  const initRequest: DP.InitializeRequest = {
    type: 'request',
    seq: 1,
    command: 'initialize',
    arguments: {
      adapterID: 'node2',
      pathFormat: 'path',
      linesStartAt1: false,
      columnsStartAt1: false,
    }
  }

  const initResponse: DP.InitializeResponse = await activeDebugger.sendRequest('initialize', initRequest)

  console.log('initResponse', initResponse)

  const launchRequest: DP.LaunchRequest = {
    seq: 2,
    type: 'request',
    command: 'launch',
    arguments: {
    }
  }

  const res2: DP.LaunchResponse = await activeDebugger.sendRequest('launch', launchRequest)
  console.log('res2', res2)
}
