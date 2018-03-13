import { go } from '../state/trade-federation'
import { action } from '../core/neovim'

action('buffer-search', go.showBufferSearch)
