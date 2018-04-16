import { action, createShadowBuffer } from '../core/neovim'
import { go } from '../state/trade-federation'

action('buffer-search', go.showBufferSearch)

setTimeout(() => {
  createShadowBuffer('explorer')
}, 3e3)
