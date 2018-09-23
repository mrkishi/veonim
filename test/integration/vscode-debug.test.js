const { src, same } = require('../util')

const api = src('vscode/api')

describe('vscode api - debug', () => {
  describe('var', () => {
    it('activeDebugConsole')
    it('activeDebugSession')
    it('breakpoints')
  })

  describe('event', () => {
    it('onDidChangeActiveDebugSession')
    it('onDidChangeBreakpoints')
    it('onDidReceiveDebugSessionCustomEvent')
    it('onDidStartDebugSession')
    it('onDidTerminateDebugSession')
  })

  describe('func', () => {
    it('addBreakpoints')
    it('registerDebugConfigurationProvider')
    it('removeBreakpoints')
    it('startDebugging')
  })
})
