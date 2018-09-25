const { src, same } = require('../util')
const msgpack = require('msgpack-lite')

const startNeovim = () => {
  const { Neovim } = src('support/binaries')

  return src('support/binaries').Neovim.run([
    '--cmd', `let g:veonim = 1 | let g:vn_loaded = 0 | let g:vn_ask_cd = 0`,
    '--cmd', `exe ":fun! Veonim(...)\\n endfun"`,
    '--cmd', `exe ":fun! VK(...)\\n endfun"`,
    '--cmd', `com! -nargs=+ -range Veonim 1`,
    '--cmd', 'com! -nargs=* Plug 1',
    '--cmd', `com! -nargs=* VeonimExt 1`,
    '--embed'
  ], {
    ...process.env,
    VIM: Neovim.path,
    VIMRUNTIME: Neovim.runtime,
  })
}

const sender = pipe => data => pipe.write(msgpack.encode(data))

describe.only('vscode api - workspace', () => {
  let workspace
  let nvim

  beforeEach(() => {
    console.log('before each yo')
    nvim = startNeovim()
    nvim.stdout.on('data', m => console.log(m+''))
    workspace = src('vscode/workspace').default
  })

  afterEach(() => {
    nvim.kill()
  })

  describe('var', () => {
    it('rootPath', () => {
      const send = sender(nvim.stdin)
      send([2, 'nvim_command', ':cd ~/proj/veonim'])
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
