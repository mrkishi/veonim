import { action, call, cmd, current as vim } from '../core/neovim'
import * as dispatch from '../messaging/dispatch'
const { ChromePicker } = require('react-color')
import { activeWindow } from '../core/windows'
import { React, ReactDom } from '../ui/uikit2'
import Overlay from '../components/overlay'
import { throttle } from '../support/utils'
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

// TODO: move to a common place
const toReactComponent = (component: any, options: object) => ({
  oncreate: (e: HTMLElement) => ReactDom.render(React.createElement(component, options), e),
  onupdate: (e: HTMLElement) => ReactDom.render(React.createElement(component, options), e),
})

// TODO: make api for this thinggggg
const containerEl = document.getElementById('plugins') as HTMLElement

const view = ($: typeof state, a: typeof actions) => Overlay({
  name: 'color-picker',
  x: $.x,
  y: $.y,
  // TODO: lol nope
  zIndex: 999999,
  visible: $.visible,
  anchorAbove: $.anchorBottom,
  // TODO: make sure this works
  onElement: el => el && onLoseFocus(el, a.hide),
}, [

  ,h('.show-cursor', {
    ...toReactComponent(ChromePicker, {
      color: $.color,
      onChangeComplete: (color: any) => a.change(color.hex),
      onChange: throttle((color: any) => a.change(color.hex), 150),
    })
  })

])

const ui = app(state, actions, view, containerEl)

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
