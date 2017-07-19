import { remote } from 'electron'
import { attach, onRedraw, onExit, g } from '../neovim'
import CanvasGrid, { CursorShape } from './canvasgrid'
import * as input from './input'
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

interface Mode {
  shape?: string,
  size?: number,
  color?: number,
}

interface ModeInfo {
  blinkoff?: number,
  blinkon?: number,
  blinkwait?: number,
  cell_percentage?: number,
  cursor_shape?: string,
  hl_id?: number,
  id_lm?: number,
  mouse_shape?: number,
  name: string,
  short_name: string
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

const modes = new Map<string, Mode>()

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

r.mode_info_set = (_: any, infos: ModeInfo[]) => infos.forEach(async mi => {
  // const color = await getColor(modeInfo.hl_id).bg
  modes.set(mi.name, {
    color: mi.hl_id,
    // color,
    shape: mi.cursor_shape,
    size: mi.cell_percentage,
  })
})

r.mode_change = (mode: string) => {
  console.log('mode', mode)
  const info = modes.get(mode)
  console.log(info)
}

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

// TODO: make these friendly names?
input.remapModifier('C', 'D')
input.remapModifier('D', 'C')

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

onExit(() => remote.app.quit())

;(async () => {
  const [ face, size, lineHeight ] = await Promise.all([
    g.vn_font,
    g.vn_font_size,
    g.vn_line_height
  ]).catch(e => e)

  ui
    .setFont({ face, size, lineHeight })
    .setCursorShape(CursorShape.block)
    .resize(window.innerHeight, window.innerWidth)

  input.focus()
  attach(ui.cols, ui.rows)
})()