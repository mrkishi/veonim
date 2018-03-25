import { action, createShadowBuffer } from '../core/neovim'
import { go } from '../state/trade-federation'

action('buffer-search', go.showBufferSearch)

action('mordor', async () => {
  console.log('creating shadow buffer')
  const success = await createShadowBuffer('explorer')
  console.log('created?', success)
})

setTimeout(() => {
  createShadowBuffer('shitbox')
}, 3e3)
