import { action, getCurrent } from '../core/neovim'
import { go } from '../state/trade-federation'

action('buffer-search', go.showBufferSearch)

action('blarg', async () => {
  const buf = await getCurrent.buffer
  const res = await buf.getMark('w0')
  console.log('blarg:', res)
})
