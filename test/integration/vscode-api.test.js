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

  describe('commands', () => {
    it('func: executeCommand')
    it('func: getCommands')
    it('func: registerCommand')
    it('func: registerTextEditorCommand')
  })
})
