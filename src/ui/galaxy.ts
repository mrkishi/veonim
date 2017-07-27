import { pub } from '../pubsub'
import { remote } from 'electron'
import ui, { CursorShape } from './canvasgrid'
import * as uiInput from './input'
import { debounce } from '../utils'
import { on, sub, notify, request } from './neovim-client'
import { Config } from '../config-reader'
import './render'
import './plugins'

interface Vim { name: string, active: boolean }

const action = sub('action')
const { resize, attach, switchTo } = notify
const { create } = request
const vims = new Map<number, Vim>()

action('vim-rename', () => {
  console.log('rename vim')
})

action('vim-create', () => {
  console.log('create new vim')
})

action('vim-switch', () => {
  console.log('switch to vim')
})
// TODO: separate module?
export const createVim = async (name: string) => {
  const id = await create()
  attach(id)
  switchTo(id)
  vims.set(id, { name, active: true })
}

export const switchVim = async (id: number) => {
  if (!vims.has(id)) return
  switchTo(id)
  vims.get(id)!.active = true
}

export const renameVim = (id: number, newName: string) => {
  if (!vims.has(id)) return
  vims.get(id)!.name = newName
}

on.exit((id: number) => {
  if (!vims.has(id)) return
  vims.delete(id)
  if (!vims.size) return remote.app.quit()

  const next = Math.max(...vims.keys())
  switchVim(next)
})

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
uiInput.registerShortcut('s-c-f', () => pub('fullscreen'))
uiInput.registerShortcut('s-c-q', () => remote.app.quit())

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
  vims.set(vimId, { name: 'main', active: true })
}

main().catch(e => console.log(e))
