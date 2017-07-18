// TODO: put somewhere else
const logger = (str: TemplateStringsArray | string, v: any[]) => typeof str === 'string'
  ? console.log(str as string)
  : console.log((str as TemplateStringsArray).map((s, ix) => s + (v[ix] || '')).join(''))

export const log = (str: TemplateStringsArray | string, ...vars: any[]) => logger(str, vars)
const $ = (...fns: Function[]) => (...a: any[]) => fns.reduce((res, fn, ix) => ix ? fn(res) : fn(...res), a)

import { attach, onRedraw, onExit, input } from '../neovim'
import { pub } from './pubsub'
import { remote } from 'electron'
import CanvasGrid, { CursorShape } from './canvasgrid'
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

interface Attrs {
  fg: string,
  bg: string,
  foreground?: number,
  background?: number,
  special?: string,
  reverse?: string,
  italic?: string,
  bold?: string,
  underline?: string,
  undercurl?: string
}

const ui = CanvasGrid({ canvasId: 'nvim', cursorId: 'cursor' })

const api = new Map<string, Function>()
const r = new Proxy(api, {
  set: (_: any, name, fn) => {
    api.set(name as string, fn)
    return true
  }
})

const colors: Colors = {
  fg: '#ccc',
  bg: '#222',
  sp: '#f00'
}

let lastScrollRegion: ScrollRegion | null = null
let nextAttrs: Attrs
const defaultScrollRegion = (): ScrollRegion => ({ top: 0, left: 0, right: ui.cols, bottom: ui.rows })

const moveRegionUp = (amount: number, { top, bottom, left, right }: ScrollRegion) => {
  const slice = ui.getImageData(left, top + amount, right - left + 1, bottom - (top + amount) + 1)
  ui
    .putImageData(slice, left, top)
    .setColor(colors.bg)
    .fillRect(left, bottom - amount + 1, right - left + 1, amount)
}

const moveRegionDown = (amount: number, { top, bottom, left, right }: ScrollRegion) => {
  const slice = ui.getImageData(left, top, right - left + 1, bottom - (top + amount) + 1)
  ui
    .putImageData(slice, left, top + amount)
    .setColor(colors.bg)
    .fillRect(left, top, right - left + 1, amount)
}

const asColor = (color: number) => '#' + [16, 8, 0].map(shift => {
  const mask = 0xff << shift
  const hex = ((color & mask) >> shift).toString(16)
  return hex.length < 2 ? ('0' + hex) : hex
}).join('')

r.clear = () => ui.setColor(colors.bg).clear()
r.update_fg = (fg: number) => fg > -1 && merge(colors, { fg: asColor(fg) })
r.update_bg = (bg: number) => bg > -1 && merge(colors, { bg: asColor(bg) })
r.update_sp = (sp: number) => sp > -1 && merge(colors, { sp: asColor(sp) })
r.cursor_goto = (row: number, col: number) => merge(ui.cursor, { col, row })
r.eol_clear = () => ui.setColor(colors.bg).fillRect(ui.cursor.col, ui.cursor.row, ui.cols - 1, 1)
r.set_scroll_region = (top: number, bottom: number, left: number, right: number) => lastScrollRegion = { top, bottom, left, right }

r.highlight_set = (attrs: Attrs = { fg: '', bg: '' }) => {
  attrs.fg = attrs.foreground ? asColor(attrs.foreground) : colors.fg
  attrs.bg = attrs.background ? asColor(attrs.background) : colors.bg
  nextAttrs = attrs
  if (attrs.reverse) merge(nextAttrs, { bg: attrs.fg, fg: attrs.bg })
}

r.scroll = (amount: number) => {
  // docs dont specify what happens when scroll
  // is called without 'set_scroll_region' first
  // so... assume the full viewport?
  amount > 0
    ? moveRegionUp(amount, lastScrollRegion || defaultScrollRegion())
    : moveRegionDown(-amount, lastScrollRegion || defaultScrollRegion())

  lastScrollRegion = null
}

r.put = (m: any[]) => {
  const total = m.length
  if (!total) return

  ui
    .setColor(nextAttrs.bg)
    .fillRect(ui.cursor.col, ui.cursor.row, total, 1)
    .setColor(nextAttrs.fg)
    .setTextBaseline('bottom')

  for (let ix = 0; ix < total; ix++) {
    ui.fillText(m[ix][0], ui.cursor.col, ui.cursor.row)
    ui.cursor.col++
    if (ui.cursor.col > ui.cols) {
      ui.cursor.col = 0
      ui.cursor.row++
    }
  }
}

ui
  .setFont({ size: 12, face: 'Roboto Mono', lineHeight: 1.5 })
  .setCursorShape(CursorShape.block)
  .resize(window.innerHeight, window.innerWidth)

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
  setTimeout(() => ui.moveCursor(), 0)
})

onExit(() => {
  console.log('goodbye see ya later')
  remote.app.quit()
})

attach(ui.cols, ui.rows)

const handleMods = ({ ctrlKey, shiftKey, metaKey, altKey }: KeyboardEvent) => {
  const mods: string[] = []
  // macos sends these fancy unicodes instead Ô∆ß on alt/alt+shift
  const notCmdOrCtrl = !metaKey && !ctrlKey
  const macOSUnicode = process.platform === 'darwin' 
    && (altKey && notCmdOrCtrl)
    || (altKey && shiftKey && notCmdOrCtrl)

  if (macOSUnicode) return mods
  if (ctrlKey) mods.push('C')
  if (shiftKey) mods.push('S')
  if (metaKey) mods.push('D')
  if (altKey) mods.push('A')
  return mods
}

const modifiers = ['Alt', 'Shift', 'Meta', 'Control']
const bypassEmptyMod = (key: string) => modifiers.includes(key) ? '' : key

const toVimKey = (key: string): string => {
  if (key === 'Backspace') return 'BS'
  if (key === '<') return 'LT'
  if (key === 'Escape') return 'Esc'
  if (key === 'Delete') return 'Del'
  if (key === ' ') return 'Space'
  else return key
}

const wrapKey = (key: string): string => key.length > 1 ? `<${key}>` : key
const combineModsWithKey = (mods: string, key: string) => mods.length ? `${mods}-${key}` : key
const formatInput = $(combineModsWithKey, wrapKey)

const remaps = new Map<string, string>()
remaps.set('C', 'D')
remaps.set('D', 'C')

const userModRemaps = (mods: string[]) => mods.map(m => remaps.get(m) || m)
const joinModsWithDash = (mods: string[]) => mods.join('-')

const mapMods = $(handleMods, userModRemaps, joinModsWithDash)
const mapKey = $(bypassEmptyMod, toVimKey)

document.addEventListener('keydown', e => {
  const key = bypassEmptyMod(e.key)
  if (!key) return

  const inputKeys = formatInput(mapMods(e), mapKey(e.key))
  if (inputKeys === '<D-r>') return pub('reload')

  e.preventDefault()
  input(inputKeys)
})
