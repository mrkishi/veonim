import { action, createShadowBuffer, cmd } from '../core/neovim'
import { go } from '../state/trade-federation'
import { delay } from '../support/utils'

action('buffer-search', go.showBufferSearch)

action('derp', async () => {
  cmd('cd $pr/veonim')
  cmd('e src/bootstrap/main.ts')
  cmd('topleft vnew')
  await delay(250)
  cmd('vert resize 30')
  cmd('b __veonim-shadow-explorer')
})

setTimeout(() => {
  createShadowBuffer('explorer')
}, 3e3)
