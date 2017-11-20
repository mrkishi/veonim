import { requireDir, debounce, log, delay as timeout } from '../utils'
import { resize, attachTo, create } from '../master-control'
import ui, { CursorShape } from './canvasgrid'
import configReader from '../config-reader'
import setDefaultSession from './sessions'
import * as uiInput from './input'
import { remote } from 'electron'
import './render'
import './notifications'

// TODO: just have config reader return promise for initialConfig?
let configLoaded: Function
const initialConfig = new Promise(done => configLoaded = done)
configReader('nvim/init.vim', c => {
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
//uiInput.remapModifier('C', 'D')
//uiInput.remapModifier('D', 'C')
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
}, 150))

const main = async () => {
  const { id, path } = await create()
  await Promise.race([ initialConfig, timeout(500) ])
  ui.setCursorShape(CursorShape.block).resize(window.innerHeight, window.innerWidth)
  uiInput.focus()
  resize(ui.cols, ui.rows)
  attachTo(id)
  setDefaultSession(id, path)
  remote.getCurrentWindow().show()
  setTimeout(() => {
    requireDir(`${__dirname}/plugins`)
    setTimeout(() => require('../ai'))
  }, 1)
}

main().catch(log)
