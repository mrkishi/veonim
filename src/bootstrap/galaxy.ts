import { CreateTask, requireDir, debounce, log, delay as timeout } from '../support/utils'
import { resize, attachTo, create } from '../core/master-control'
import ui, { CursorShape } from '../core/canvasgrid'
import configReader from '../config/config-reader'
import setDefaultSession from '../core/sessions'
import { sub } from '../messaging/dispatch'
import * as uiInput from '../core/input'
import { remote } from 'electron'
import '../ui/notifications'
import '../core/render'
import { resizeGrid } from '../core/grid'

const loadingConfig = CreateTask()

configReader('nvim/init.vim', c => {
  ui.setFont({
    face: c.get('font'),
    size: c.get('font_size')-0,
    lineHeight: c.get('line_height')-0
  })

  loadingConfig.done('')
})

const refreshCanvas = () => {
  ui.resize()
  resizeGrid(ui.rows, ui.cols)
  resize(ui.cols, ui.rows)
}

window.matchMedia('screen and (min-resolution: 2dppx)').addListener(refreshCanvas)
window.addEventListener('resize', debounce(() => refreshCanvas(), 150))

sub('colors.vim.bg', color => {
  if (document.body.style.background !== color) document.body.style.background = color
})

const main = async () => {
  const { id, path } = await create()
  await Promise.race([ loadingConfig.promise, timeout(500) ])
  ui.setCursorShape(CursorShape.block)
  refreshCanvas()
  uiInput.focus()
  attachTo(id)
  setDefaultSession(id, path)
  remote.getCurrentWindow().show()

  setTimeout(() => {
    requireDir(`${__dirname}/../components`)
    setTimeout(() => require('../core/ai'))
  }, 1)
}

main().catch(log)
