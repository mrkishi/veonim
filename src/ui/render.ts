import { onRedraw, getColor } from '../master-control'
import ui, { CursorShape } from './canvasgrid'
import * as dispatch from '../dispatch'
import { ExtContainer } from '../api'
import { asColor, merge } from '../utils'

interface Colors { fg: string, bg: string, sp: string }
interface Mode { shape: CursorShape, size?: number, color?: string }
interface ScrollRegion { top: number, bottom: number, left: number, right: number }
interface Attrs { fg: string, bg: string, foreground?: number, background?: number, special?: string, reverse?: string, italic?: string, bold?: string, underline?: string, undercurl?: string }
interface ModeInfo { blinkoff?: number, blinkon?: number, blinkwait?: number, cell_percentage?: number, cursor_shape?: string, hl_id?: number, id_lm?: number, mouse_shape?: number, name: string, short_name: string }
interface PMenuItem { word: string, kind: string, menu: string, info: string }

let lastScrollRegion: ScrollRegion | null = null
let nextAttrs: Attrs
let currentMode: string

const api = new Map<string, Function>()
const r = new Proxy(api, { set: (_: any, name, fn) => (api.set(name as string, fn), true) })
const modes = new Map<string, Mode>()
const colors: Colors = { fg: '#ccc', bg: '#222', sp: '#f00' }
const defaultScrollRegion = (): ScrollRegion => ({ top: 0, left: 0, right: ui.cols, bottom: ui.rows })

const cursorShapeType = (type: string | undefined) => {
  if (type === 'block') return CursorShape.block
  if (type === 'horizontal') return CursorShape.underline
  if (type === 'vertical') return CursorShape.line
  else return CursorShape.block
}

const moveRegionUp = (amount: number, { top, bottom, left, right }: ScrollRegion) => {
  const width = right - left + 1
  const height = bottom - (top + amount) + 1
  const slice = ui.getImageData(left, top + amount, width, height)
  ui
    .putImageData(slice, left, top, width, height)
    .setColor(colors.bg)
    .fillRect(left, bottom - amount + 1, right - left + 1, amount)
}

const moveRegionDown = (amount: number, { top, bottom, left, right }: ScrollRegion) => {
  const width = right - left + 1
  const height = bottom - (top + amount) + 1
  const slice = ui.getImageData(left, top, width, height)
  ui
    .putImageData(slice, left, top + amount, width, height)
    .setColor(colors.bg)
    .fillRect(left, top, right - left + 1, amount)
}

r.clear = () => ui.setColor(colors.bg).clear()
r.cursor_goto = (row: number, col: number) => merge(ui.cursor, { col, row })
r.eol_clear = () => ui.setColor(colors.bg).fillRect(ui.cursor.col, ui.cursor.row, ui.cols, 1)
r.set_scroll_region = (top: number, bottom: number, left: number, right: number) => lastScrollRegion = { top, bottom, left, right }

r.update_fg = (fg: number) => {
  if (fg < 0) return
  merge(colors, { fg: asColor(fg) })
  dispatch.pub('colors.vim.fg', colors.fg)
}

r.update_bg = (bg: number) => {
  if (bg < 0) return
  merge(colors, { bg: asColor(bg) })
  dispatch.pub('colors.vim.bg', colors.bg)
}

r.update_sp = (sp: number) => {
  if (sp < 0) return
  merge(colors, { sp: asColor(sp) })
  dispatch.pub('colors.vim.sp', colors.sp)
}

r.mode_info_set = (_: any, infos: ModeInfo[]) => infos.forEach(async mi => {
  const info = {
    shape: cursorShapeType(mi.cursor_shape),
    size: mi.cell_percentage
  }

  if (mi.hl_id) {
    const { bg } = await getColor(mi.hl_id)
    merge(info, { color: bg || colors.fg })
    if (mi.name === currentMode && bg) ui.setCursorColor(bg).setCursorShape(info.shape, info.size)
  }

  modes.set(mi.name, info)
})

r.mode_change = async (mode: string) => {
  currentMode = mode
  const info = modes.get(mode)
  if (!info) return dispatch.pub('mode', mode)
  info.color && ui.setCursorColor(info.color)
  ui.setCursorShape(info.shape, info.size)
}

r.highlight_set = (attrs: Attrs = { fg: '', bg: '' }) => {
  attrs.fg = attrs.foreground ? asColor(attrs.foreground) : colors.fg
  attrs.bg = attrs.background ? asColor(attrs.background) : colors.bg
  nextAttrs = attrs
  if (attrs.reverse) merge(nextAttrs, { bg: attrs.fg, fg: attrs.bg })
}

r.scroll = (amount: number) => {
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
    .setTextBaseline('top')

  for (let ix = 0; ix < total; ix++) {
    if (m[ix][0] !== ' ') ui.fillText(m[ix][0], ui.cursor.col, ui.cursor.row)
    ui.cursor.col++
  }
}

r.popupmenu_hide = () => dispatch.pub('pmenu.hide')
r.popupmenu_select = (ix: number) => dispatch.pub('pmenu.select', ix)
r.popupmenu_show = (items: PMenuItem[], ix: number, row: number, col: number) =>
  dispatch.pub('pmenu.show', { items, ix, row, col })

r.tabline_update = (curtab: ExtContainer, tabs: ExtContainer[]) => dispatch.pub('tabs', { curtab, tabs })

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
