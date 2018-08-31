import { VimMode, BufferType } from '../neovim/types'

export const state = {
  background: '#2d2d2d',
  foreground: '#dddddd',
  special: '#ef5188',
  mode: VimMode.Normal,
  bufferType: BufferType.Normal,
  absoluteFilepath: '',
  file: '',
  filetype: '',
  cwd: '',
  colorscheme: '',
  revision: -1,
  line: 0,
  column: 0,
  editorTopLine: 0,
  editorBottomLine: 0,
}

export type NeovimState = typeof state
