import { action, cmd } from '../core/neovim'
import { delay } from '../support/utils'

action('blarg', async () => {
  cmd('cd $pr/plugin-manager')
  cmd('e blarg.js')
  cmd('Veonim start-debug')
})

action('derp', async () => {
  cmd('cd $pr/plugin-manager')
  cmd('e src/main.ts')
})

action('derp:explorer', async () => {
  cmd('cd $pr/veonim')
  cmd('e src/bootstrap/main.ts')
  cmd('topleft vnew')
  await delay(250)
  cmd('vert resize 30')
  cmd('b Explorer')
})
