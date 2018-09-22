const { src, same, globalProxy } = require('../util')

const api = src('vscode/api')

describe('vscode api', () => {
  describe('env', () => {
    it('var: appName')
    it('var: appRoot')
    it('var: language')
    it('var: machineId')
    it('var: sessionId')
  })

  describe('debug', () => {
    it('var: activeDebugConsole')
    it('var: activeDebugSession')
    it('var: breakpoints')

    it('event: onDidChangeActiveDebugSession')
    it('event: onDidChangeBreakpoints')
    it('event: onDidReceiveDebugSessionCustomEvent')
    it('event: onDidStartDebugSession')
    it('event: onDidTerminateDebugSession')

    it('func: addBreakpoints')
    it('func: registerDebugConfigurationProvider')
    it('func: removeBreakpoints')
    it('func: startDebugging')
  })

  describe('commands', () => {
    it('func: executeCommand')
    it('func: getCommands')
    it('func: registerCommand')
    it('func: registerTextEditorCommand')
  })
})
