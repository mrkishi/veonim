import { createVim } from '../sessions'
import * as viminput from '../input'
import { merge } from '../../utils'
import { action, listBuffers } from '../neovim'
import vim from '../canvasgrid'
import huu from 'huu'
// TODO: get the typings when ready: https://github.com/hyperapp/hyperapp/pull/311
const { h: hs, app: makeApp } = require('hyperapp')
export const h = huu(hs)

const hostElement = document.getElementById('plugins')
export const getHostElement = () => hostElement as HTMLElement

// TODO: because mixins and events.beforeAction dont work in the current npm release of hyperapp
// TODO: formalize the wrappings in huu module?
// TODO: don't export Action/Event from utils and this from plugin. put in central organized place...
export const app = (appParts: any, switchFocus = true) => {
  const { show, hide } = appParts.actions

  if (switchFocus) appParts.actions.show = (s: any, a: any, d: any) => {
    viminput.blur()
    vim.hideCursor()
    return show(s, a, d)
  }

  if (switchFocus) appParts.actions.hide = (s: any, a: any, d: any) => {
    setImmediate(() => viminput.focus())
    vim.showCursor()
    return hide(s, a, d)
  }

  return makeApp(merge(appParts, { root: hostElement }))
}

// TODO: require all in plugins dir (dynamically)?
import './files'
import './buffers'
import './explorer'
import './commands'
import './change-dir'
import './vim-create'
import './vim-rename'
import './vim-switch'
import './color-picker'
import './autocomplete'
import './tabline'

action('vim-create-dir', () => createVim('dir-unnamed', true))
action('lol', async () => {
  const res = await listBuffers()
  console.log('buffers', res)
})
