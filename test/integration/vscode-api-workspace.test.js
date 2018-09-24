const { src, same } = require('../util')

const startNeovim = () => {
  console.log('UH HELLO')
  const { Neovim } = src('support/binaries')
  console.log('Neovim', Neovim)

  const spawnVimInstance = () => Neovim.run([
  '--cmd', `${startupFuncs()} | ${startupCmds}`,
    '--cmd', `com! -nargs=* Plug 1`,
    '--cmd', `com! -nargs=* VeonimExt 1`,
    '--cmd', `com! -nargs=+ -range -complete=custom,VeonimCmdCompletions Veonim call Veonim(<f-args>)`,
    '--embed'
], {
  ...process.env,
  VIM: Neovim.path,
  VIMRUNTIME: Neovim.runtime,
})
}

describe.only('vscode api - workspace', () => {
  let workspace

  beforeEach(() => {
    console.log('before each yo')
    startNeovim()
    workspace = src('vscode/workspace').default
  })

  describe('var', () => {
    it('rootPath', () => {
      same(workspace.rootPath, 'lol')
    })
    it('workspaceFolders')
    it('name')
    it('textDocuments')
  })

  describe('events', () => {
    it('onWillSaveTextDocument')
    it('onDidChangeWorkspaceFolders')
    it('onDidOpenTextDocument')
    it('onDidCloseTextDocument')
    it('onDidChangeTextDocument')
    it('onDidSaveTextDocument')
    it('onDidChangeConfiguration')
  })

  describe('func', () => {
    it('getWorkspaceFolder')
    it('asRelativePath')
    it('updateWorkspaceFolders')
    it('createFileSystemWatcher')
    it('findFiles')
    it('saveAll')
    it('applyEdit')
    it('openTextDocument')
    it('openTextDocument')
    it('openTextDocument')
    it('registerTextDocumentContentProvider')
    it('getConfiguration')
    it('registerTaskProvider')
    it('registerFileSystemProvider')
  })
})
