import { sub } from '../neovim-client'
import * as viminput from '../input'
import { merge } from '../../utils'
import vim from '../canvasgrid'
import huu from 'huu'
// TODO: get the typings when ready: https://github.com/hyperapp/hyperapp/pull/311
const { h: hs, app: makeApp } = require('hyperapp')
export const h = huu(hs)

const action = sub('action')
const hostElement = document.getElementById('plugins')
export const getHostElement = () => hostElement as HTMLElement

// TOOD: because mixins and events.beforeAction dont work in the current npm release of hyperapp
export const app = (appParts: any) => {
  const { show, hide } = appParts.actions

  appParts.actions.show = (s: any, a: any, d: any) => {
    viminput.blur()
    vim.hideCursor()
    return show(s, a, d)
  }

  appParts.actions.hide = (s: any, a: any, d: any) => {
    setImmediate(() => viminput.focus())
    vim.showCursor()
    return hide(s, a, d)
  }

  return makeApp(merge(appParts, { root: hostElement }))
}

// TODO: require all in plugins dir (dynamically)?
import files from './files'
import buffers from './buffers'
import vimCreate from './vim-create'
import vimRename from './vim-rename'

// TODO: any way the plugin can declare for itself what actions to listen to?
// or just bind actions directly in plugin?
action('files', files)
action('buffers', buffers)
action('vim-create', vimCreate)
action('vim-rename', vimRename)

if (process.env.VEONIM_DEV) {
  const plugins = [
    'files',
    'buffers'
  ]

  const cleanup = (name: string) => {
    const el = document.getElementById(name)
    if (!el) return console.log('did not find', name)
    el.parentNode && el.parentNode.removeChild(el)
  }

  const { watch } = require('chokidar')
  const reload = require('require-reload')(require)

  plugins.forEach(p => watch(`${__dirname}/${p}.js`).on('change', () => {
    cleanup(p)
    const mod = reload(`./${p}`).default
    console.log(`reloading ${p}`)
    action(p, mod)
  }))
}