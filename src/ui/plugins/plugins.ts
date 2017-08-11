import { action } from '../../neovim'
//import { sub } from '../neovim-client'
import { createVim } from '../sessions'
import * as viminput from '../input'
import { merge } from '../../utils'
import vim from '../canvasgrid'
import huu from 'huu'
// TODO: get the typings when ready: https://github.com/hyperapp/hyperapp/pull/311
const { h: hs, app: makeApp } = require('hyperapp')
export const h = huu(hs)

//const action = sub('action')
const hostElement = document.getElementById('plugins')
export const getHostElement = () => hostElement as HTMLElement

// TODO: because mixins and events.beforeAction dont work in the current npm release of hyperapp
// TODO: formalize the wrappings in huu module?
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
import files from './files'
import buffers from './buffers'
import explorer from './explorer'
import commands from './commands'
import changeDir from './change-dir'
import vimCreate from './vim-create'
import vimRename from './vim-rename'
import vimSwitch from './vim-switch'
import colorPicker from './color-picker'
import './autocomplete'
import './tabline'

// TODO: should the plugin declare for itself what actions to listen to?
// or just bind actions directly in plugin?
action('files', files)
action('buffers', buffers)
action('explorer', explorer)
action('vim-create', vimCreate)
action('vim-rename', vimRename)
action('vim-switch', vimSwitch)
action('commands', commands)
action('vim-create-dir', () => createVim('dir-unnamed', true))
action('change-dir', (path = '') => changeDir(path, false))
action('init-dir', (path = '') => changeDir(path, true))
action('pick-color', colorPicker)
