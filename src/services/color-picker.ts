import { action, call, cmd } from '../core/neovim'
import * as dispatch from '../messaging/dispatch'
import { go } from '../state/trade-federation'

dispatch.sub('colorpicker.change', (color: string) => {
  console.log('color change:', color)
})

dispatch.sub('colorpicker.complete', (color: string) => {
  if (color) cmd(`exec "normal! ciw${color}"`)
  go.hideColorPicker()
})

action('pick-color', async () => {
  const word = await call.expand('<cword>')
  go.pickColor(word)
})
