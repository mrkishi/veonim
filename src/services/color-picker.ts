import { action, call, cmd, current as vim } from '../core/neovim'
import * as dispatch from '../messaging/dispatch'
import { go } from '../state/trade-federation'
import { basename, extname } from 'path'
import { debounce } from '../support/utils'

let liveMode = false

// TODO: this will save/modify the current colorscheme file. any way to
// short-circuit the save through an alt temp file or other clever method?
const possiblyUpdateColorScheme = debounce(() => {
  if (!liveMode) return
  if (!vim.file.endsWith('.vim')) return

  const colorschemeBeingEdited = basename(vim.file, extname(vim.file))
  const currentActiveColorscheme = vim.colorscheme

  if (currentActiveColorscheme !== colorschemeBeingEdited) return

  cmd(`write`)
  cmd(`colorscheme ${currentActiveColorscheme}`)
  dispatch.pub('colorscheme.modified')
}, 300)

dispatch.sub('colorpicker.change', (color: string) => {
  cmd(`exec "normal! ciw${color}"`)
  possiblyUpdateColorScheme()
})

dispatch.sub('colorpicker.complete', (color: string) => {
  cmd(`exec "normal! ciw${color}"`)
  possiblyUpdateColorScheme()
})

// action('pick-color', async () => {
//   liveMode = false
//   const word = await call.expand('<cword>')
//   go.pickColor(word)
// })

// action('modify-colorscheme-live', async () => {
//   liveMode = true
//   const word = await call.expand('<cword>')
//   go.pickColor(word)
// })
