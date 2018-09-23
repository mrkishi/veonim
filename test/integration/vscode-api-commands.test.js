const { src, same, spy } = require('../util')

const { commands } = src('vscode/api').default

describe('vscode api - commands', () => {
  describe('func', () => {
    it('registerCommand', () => {
      const callback = spy()
      const disposeCommand = commands.registerCommand('blarg', callback)
      commands.executeCommand('blarg', 42)
      disposeCommand.dispose()
      commands.executeCommand('blarg', 22)
      same(callback.calls, [ [42] ])
    })

    it('getCommands', async () => {

    })

    it('executeCommand', async () => {

    })

    it('registerTextEditorCommand')
  })
})
