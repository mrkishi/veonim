import { action, call, cmd, current as vim } from '../core/neovim'
import * as dispatch from '../messaging/dispatch'
import { activeWindow } from '../core/windows'
import ColorPicker from '../ui/color-picker'
import Overlay from '../components/overlay'
import { debounce } from '../support/utils'
import onLoseFocus from '../ui/lose-focus'
import { basename, extname } from 'path'
import { cursor } from '../core/cursor'
import { h, app } from '../ui/uikit'

let liveMode = false

const getPosition = (row: number, col: number) => ({
  x: activeWindow() ? activeWindow()!.colToX(col - 1) : 0,
  y: activeWindow() ? activeWindow()!.rowToTransformY(row > 12 ? row : row + 1) : 0,
  anchorBottom: row > 12,
})

const colorPicker = ColorPicker()

// TODO: this will save/modify the current colorscheme file. any way to
// short-circuit the save through an alt temp file or other clever method?
//
// actually, in the new revised ui grid protocol, we should be receiving
// semantic ui coloring names instead of hardcoded values. aka will receive
// this text: 'blah', this hlgrp: 'NORMAL'. a separate msg will send the
// values for hlgroups. we can use this new format to redraw the screen
// with our custom hlgroup values (temporarily) instead of the neovim
// specified hlgroup values
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

const state = {
  x: 0,
  y: 0,
  color: '',
  visible: false,
  anchorBottom: false,
}

const actions = {
  change: (color: string) => {
    cmd(`exec "normal! ciw${color}"`)
    possiblyUpdateColorScheme()
    return { color }
  },
  show: (color: string) => ({
    color,
    visible: true,
    ...getPosition(cursor.row, cursor.col),
  }),
  hide: () => ({ color: '', visible: false }),
}

const view = ($: typeof state, a: typeof actions) => Overlay({
  x: $.x,
  y: $.y,
  zIndex: 900,
  visible: $.visible,
  anchorAbove: $.anchorBottom,
}, [

  ,h('.show-cursor', {
    onupdate: (e: HTMLElement) => onLoseFocus(e, a.hide),
    oncreate: (e: HTMLElement) => e.appendChild(colorPicker.element),
  })

])

const ui = app({ name: 'color-picker', state, actions, view })

// TODO: not sure why we need to send this back into hyperapp
// maybe just do the actions here...
colorPicker.onChange(val => ui.change(val))

action('pick-color', async () => {
  liveMode = false
  const word = await call.expand('<cword>')
  ui.show(word)
})

action('modify-colorscheme-live', async () => {
  liveMode = true
  const word = await call.expand('<cword>')
  ui.show(word)
})
