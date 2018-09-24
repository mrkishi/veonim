const { src, same, spy } = require('../util')

const { commands } = src('vscode/api').default

describe('vscode api - commands', () => {
  describe('func', () => {
    it('registerCommand', () => {
      const callback = spy()
      const command = commands.registerCommand('blarg', callback)
      commands.executeCommand('blarg', 42)
      command.dispose()
      commands.executeCommand('blarg', 22)
      same(callback.calls, [ [42] ])
    })

    it('getCommands', async () => {
      const ayy = commands.registerCommand('ayy', () => {})
      const lmao = commands.registerCommand('lmao', () => {})
      const umad = commands.registerCommand('_umad', () => {})

      const coms = await commands.getCommands()
      const comsNoInternal = await commands.getCommands(true)

      same(coms, ['ayy', 'lmao', '_umad'])
      same(comsNoInternal, ['ayy', 'lmao'])

      ayy.dispose()

      const coms2 = await commands.getCommands(true)

      same(coms2, ['lmao'])
    })

    it('executeCommand', async () => {

    })

    it('registerTextEditorCommand')
  })
})
