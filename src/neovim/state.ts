import { VimMode } from '../neovim/interfaces'

// TODO: make it redux compatible. immutable pls
const state = {
  background: '#2d2d2d',
  foreground: '#dddddd',
  special: '#ff0000',
  mode: VimMode.Normal,
}
