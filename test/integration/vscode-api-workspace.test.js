const { src, same } = require('../util')
const startNeovim = require('../nvim-for-test')

// TODO: remove ONLY
// TODO: remove ONLY
// TODO: remove ONLY
// TODO: remove ONLY
// TODO: remove ONLY
// TODO: remove ONLY
// TODO: remove ONLY
describe.only('vscode api - workspace', () => {
  let workspace
  let nvim
  let pipeName

  before(() => {
    global.onmessage = () => {}
    global.postMessage = () => {}
  })

  after(() => {
    delete global.onmessage
    delete global.postMessage
  })

  beforeEach(async () => {
    nvim = startNeovim()
    workspace = src('vscode/workspace').default
    pipeName = await nvim.request('eval', 'v:servername')

    global.onmessage({ data: ['sessionCreate', [1, pipeName]] })
    global.onmessage({ data: ['sessionSwitch', [1]] })

    // TODO: relative path pls. also make it for test/data
    nvim.notify('command', ':cd ~/proj/veonim')
  })

  afterEach(() => {
    nvim.shutdown()
  })

  describe('var', () => {
    it('rootPath', () => {
      console.log('rootPath:', JSON.stringify(workspace.rootPath))
      same(workspace.rootPath, '~/proj/veonim')
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
