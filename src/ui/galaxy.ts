// TODO: put somewhere else
const logger = (str: TemplateStringsArray | string, v: any[]) => typeof str === 'string'
  ? console.log(str as string)
  : console.log((str as TemplateStringsArray).map((s, ix) => s + (v[ix] || '')).join(''))

export const log = (str: TemplateStringsArray | string, ...vars: any[]) => logger(str, vars)
export const onProp = <T>(cb: Function): T => new Proxy({}, { get: (_, name) => cb(name) }) as T

import { attach, onRedraw, onExit, input } from '../neovim'
import { remote } from 'electron'
import CanvasGrid from './canvasgrid'
const merge = Object.assign

interface ScrollRegion {
  top: number,
  bottom: number,
  left: number,
  right: number
}

interface Colors {
  fg: string,
  bg: string,
  sp: string
}

const ui = CanvasGrid('nvim', 'cursor')

const api = new Map<string, Function>()
const r = new Proxy(api, {
  set: (_: any, name, fn) => {
    api.set(name as string, fn)
    return true
  }
})

let lastScrollRegion: ScrollRegion | null = null
const colors: Colors = {
  fg: '#ccc',
  bg: '#222',
  sp: '#f00'
}

const defaultScrollRegion = (): ScrollRegion => ({
  top: 0,
  left: 0,
  right: ui.cols,
  bottom: ui.rows
})

const moveRegionUp = (amount: number, { top, bottom, left, right }: ScrollRegion) => {
  const slice = ui.getImageData(left, top, right, bottom)
  ui
  .putImageData(slice, left, top + amount)
  .setColor(colors.bg)
  .fillRect(left, top, right, bottom)
}

const moveRegionDown = (amount: number, { top, bottom, left, right }: ScrollRegion) => {
  const slice = ui.getImageData(left, top, right, bottom)
  ui
  .putImageData(slice, left, top + amount)
  .setColor(colors.bg)
  .fillRect(left, top, right, bottom)
}

r.cursor_goto = (row: number, col: number) => merge(ui.cursor, { col, row })
r.update_fg = (fg: number) => fg > -1 && merge(colors, { fg })
r.update_bg = (bg: number) => bg > -1 && merge(colors, { bg })
r.update_sp = (sp: number) => sp > -1 && merge(colors, { sp })
r.set_scroll_region = (top: number, bottom: number, left: number, right: number) => lastScrollRegion = { top, bottom, left, right }
r.eol_clear = () => ui.setColor(colors.bg).fillRect(ui.cursor.col, ui.cursor.row, ui.cols - 1, 1)
// r.eol_clear = () => clearBlock(cursor.col, cursor.row, ui.cols - cursor.col + 1, 1)
r.clear = () => ui.setColor(colors.bg).clear()

r.put = (m: any[]) => {
  const total = m.length
  if (!total) return
  ui.setColor(colors.bg).fillRect(ui.cursor.col, ui.cursor.row, total, 1)

  // TODO: best baseline?
  ui.setColor(colors.fg).setTextBaseline('bottom')

  for (let ix = 0; ix < total; ix++) {
    ui.fillText(m[ix][0], ui.cursor.col, ui.cursor.row)
    ui.cursor.col++
    if (ui.cursor.col > ui.cols) {
      ui.cursor.col = 0
      ui.cursor.row++
    }
  }
}

r.scroll = (amount: number) => {
  // docs dont specify what happens when scroll
  // is called without 'set_scroll_region' first
  // so... assume the full viewport?
  amount > 0
    ? moveRegionUp(amount, lastScrollRegion || defaultScrollRegion())
    : moveRegionDown(amount, lastScrollRegion || defaultScrollRegion())

  lastScrollRegion = null
}

ui.setFont({ size: 12, face: 'Roboto Mono', lineHeight: 1.5 }).resize(window.innerHeight, window.innerWidth)

onRedraw((m: any[]) => {
  const count = m.length
  for (let ix = 0; ix < count; ix++) {
    const [ method, ...args ] = m[ix]
    const fn = api.get(method)
    if (fn) method === 'put' 
      ? fn(args)
      : args.forEach((a: any[]) => fn(...a))
  }

  lastScrollRegion = null
  ui.moveCursor()
})

onExit(() => {
  console.log('goodbye see ya later')
  remote.app.quit()
})

attach(ui.cols, ui.rows)

const getMetaKey = (ctrl: boolean, shift: boolean, meta: boolean, alt: boolean): string => {
  if (ctrl) return 'C'
  if (shift) return 'S'
  if (meta) return 'D'
  if (alt) return 'A'
  else return ''
}

const toVimKey = (key: string): string => {
  if (key === 'Backspace') return 'BS'
  if (key === '<') return 'LT'
  if (key === 'Escape') return 'Esc'
  if (key === 'Delete') return 'Del'
  if (key === ' ') return 'Space'
  else return key
}

const wrapKey = (key: string): string => key.length > 1 ? `<${key}>` : key

const remaps = new Map<string, string>()
remaps.set('C', 'D')
remaps.set('D', 'C')

const userRemaps = (key: string): string => remaps.get(key) || key

document.addEventListener('keydown', (e) => {
  const { key, ctrlKey: ctrl, shiftKey: shift, metaKey: meta, altKey: alt } = e
  const inputSequence = ctrl || shift || meta || alt
    ? `<${userRemaps(getMetaKey(ctrl, shift, meta, alt))}-${key}>`
    : wrapKey(toVimKey(key))

  console.log(`input: ${inputSequence}`)
  e.preventDefault()
  input(inputSequence)
})
