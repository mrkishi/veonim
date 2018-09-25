const { src, same } = require('../util')
const startNeovim = require('../nvim-for-test')

describe.only('vscode api - workspace', () => {
  let workspace
  let nvim
  let pipeName

  beforeEach(async () => {
    nvim = startNeovim()
    workspace = src('vscode/workspace').default
    nvim.notify('command', ':cd ~/proj/veonim')
    pipeName = await nvim.request('eval', 'v:servername')
  })

  afterEach(() => {
    nvim.shutdown()
  })

  describe('var', () => {
    it('rootPath', () => {
      console.log('pipeName:', pipeName)
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
