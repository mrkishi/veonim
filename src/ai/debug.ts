import { DebugProtocol as DP } from 'vscode-debugprotocol'
import * as extensions from '../core/extensions'
import { objToMap } from '../support/utils'

// TODO: in the future we will want the ability to have multiple
// debuggers running at the same time (vscode does something like this)
let activeDebugger = {} as extensions.RPCServer

export const start = async (type: string) => {
  console.log('start debugger:', type)

  const features = new Map<string, any>()
  activeDebugger = await extensions.start.debug(type)
  await new Promise(f => setTimeout(f, 1e3))

  activeDebugger.onNotification('initialized', () => {
    console.log('INITIALIZED! SEND DA BREAKPOINTS!')
    console.log(features)
    // TODO: SEND BREAKPOINTS LOL
  })

  activeDebugger.onNotification('capabilities', ({ capabilities }) => {
    objToMap(capabilities, features)
  })

  activeDebugger.onNotification('loadedSource', m => {
    // TODO: wat i do wit dis?
    // console.log('loadedSource:', m)
  })

  activeDebugger.onNotification('output', data => {
    if (data.category === 'console' || data.category === 'stderr') console.log(type, data.output)
  })

  const initRequest: DP.InitializeRequest['arguments'] = {
    adapterID: 'node2',
    pathFormat: 'path',
    linesStartAt1: false,
    columnsStartAt1: false,
  }

  const supportedCapabilities = await activeDebugger.sendRequest('initialize', initRequest)
  objToMap(supportedCapabilities, features)

  // TODO: SEE DIS WAT DO? "Instead VS Code passes all arguments from the user's launch configuration to the launch or attach requests"
  await activeDebugger.sendRequest('launch')
}
