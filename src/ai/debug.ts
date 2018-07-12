import * as extensions from '../core/extensions'

// TODO: in the future we will want the ability to have multiple
// debuggers running at the same time (vscode does something like this)
let activeDebugger = {} as extensions.RPCServer

export const start = async (type: string) => {
  activeDebugger = await extensions.start.debug(type)
  console.log('activeDebugger', activeDebugger)
  // TODO: init stuffzzzzz
}

