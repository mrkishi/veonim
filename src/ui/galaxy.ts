import { remote } from 'electron'
import ui, { CursorShape } from './canvasgrid'
import * as uiInput from './input'
import { debounce } from '../utils'
import { on, notify, request } from './neovim-client'
import { Config } from '../config-reader'
import setDefaultSession from './sessions'
import './render'
import './plugins/plugins'

const { resize, attach } = notify
const { create } = request

let configLoaded: Function
const initalConfig = new Promise(done => configLoaded = done)
on.config((c: Config) => {
  ui.setFont({
    face: c.get('font'),
    size: c.get('font_size')-0,
    lineHeight: c.get('line_height')-0
  })

  const margins = c.get('margins')-0
  if (margins) ui.setMargins({ left: margins, right: margins, top: margins, bottom: margins })

  ui.setMargins({
    left: c.get('margin_left')-0,
    right: c.get('margin_right')-0,
    top: c.get('margin_top')-0,
    bottom: c.get('margin_bottom')-0
  })

  configLoaded()
})

// TODO: make these friendly names?
// TODO: read from vim config
uiInput.remapModifier('C', 'D')
uiInput.remapModifier('D', 'C')
uiInput.registerShortcut('s-c-|', () => remote.getCurrentWebContents().toggleDevTools())
uiInput.registerShortcut('s-c-x', () => remote.app.quit())
uiInput.registerShortcut('s-c-f', () => {
  // TODO: why no work?
  const win = remote.getCurrentWindow()
  win.setFullScreen(!win.isFullScreen())
})

window.addEventListener('resize', debounce(() => {
  ui.resize(window.innerHeight, window.innerWidth)
  resize(ui.cols, ui.rows)
}, 500))

const main = async () => {
  const vimId = await create()
  await initalConfig
  ui.setCursorShape(CursorShape.block).resize(window.innerHeight, window.innerWidth)
  uiInput.focus()
  resize(ui.cols, ui.rows)
  attach(vimId)
  setDefaultSession(vimId)
}

main().catch(e => console.log(e))
