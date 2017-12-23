import { onRedraw, getColor } from '../core/master-control'
import ui, { CursorShape } from '../core/canvasgrid'
import { Events, ExtContainer } from '../core/api'
import { asColor, merge } from '../support/utils'
import * as dispatch from '../messaging/dispatch'
import * as grid from '../core/grid'
import { getWindow, applyToWindows } from '../components/windows'

interface Colors {
  fg: string,
  bg: string,
  sp: string,
}

interface Mode {
  shape: CursorShape,
  size?: number,
  color?: string,
}

interface ScrollRegion {
  top: number,
  bottom: number,
  left: number,
  right: number,
}

interface Attrs {
  foreground?: number,
  background?: number,
  special?: string,
  reverse?: string,
  italic?: string,
  bold?: string,
  underline?: string,
  undercurl?: string,
}

interface NextAttrs extends Attrs {
  fg: string,
  bg: string,
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
  short_name: string,
}

interface PMenuItem {
  word: string,
  kind: string,
  menu: string,
  info: string,
}

let lastScrollRegion: ScrollRegion | null = null
let currentMode: string

const api = new Map<string, Function>()
const modes = new Map<string, Mode>()

// because a Map is higher perf than an object
const r: Events = new Proxy(api, {
  set: (_: any, name, fn) => (api.set(name as string, fn), true)
})

const colors: Colors = {
  fg: '#ccc',
  bg: '#222',
  sp: '#f00'
}

const nextAttrs: NextAttrs = {
  fg: colors.fg,
  bg: colors.bg,
}

const defaultScrollRegion = (): ScrollRegion => ({
  top: 0,
  left: 0,
  right: ui.cols,
  bottom: ui.rows
})

const cursorShapeType = (shape?: string) => {
  if (shape === 'block') return CursorShape.block
  if (shape === 'horizontal') return CursorShape.underline
  if (shape === 'vertical') return CursorShape.line
  else return CursorShape.block
}

const moveRegionUp = (amount: number, { top, bottom, left, right }: ScrollRegion) => {
  const w = getWindow(top, left)
  const width = right - left + 1
  const height = bottom - (top + amount) + 1

  w && w
    .moveRegion({
      width,
      height,
      source: {
        col: left,
        row: top + amount,
      },
      destination: {
        col: left,
        row: top,
      }
    })
    .setColor(colors.bg)
    .fillRect(left, bottom - amount + 1, right - left + 1, amount)

  grid.moveRegionUp(amount, top, bottom, left, right)
}

const moveRegionDown = (amount: number, { top, bottom, left, right }: ScrollRegion) => {
  const w = getWindow(top, left)
  const width = right - left + 1
  const height = bottom - (top + amount) + 1

  w && w
    .moveRegion({
      width,
      height,
      source: {
        col: left,
        row: top
      },
      destination: {
        col: left,
        row: top + amount
      }
    })
    .setColor(colors.bg)
    .fillRect(left, top, right - left + 1, amount)

  grid.moveRegionDown(amount, top, bottom, left, right)
}

r.cursor_goto = (row, col) => merge(ui.cursor, { col, row })
r.set_scroll_region = (top, bottom, left, right) => lastScrollRegion = { top, bottom, left, right }

r.clear = () => {
  applyToWindows(w => w.setColor(colors.bg).clear())
  grid.clear()
}

r.eol_clear = () => {
  const win = getWindow(ui.cursor.row, ui.cursor.col)

  win && win
    .setColor(colors.bg)
    .fillRect(ui.cursor.col, ui.cursor.row, ui.cols, 1)

  grid.clearLine(ui.cursor.row, ui.cursor.col)
}

r.update_fg = fg => {
  if (fg < 0) return
  merge(colors, { fg: asColor(fg) })
  dispatch.pub('colors.vim.fg', colors.fg)
  grid.setForeground(colors.fg)
}

r.update_bg = bg => {
  if (bg < 0) return
  merge(colors, { bg: asColor(bg) })
  dispatch.pub('colors.vim.bg', colors.bg)
  grid.setBackground(colors.bg)
}

r.update_sp = sp => {
  if (sp < 0) return
  merge(colors, { sp: asColor(sp) })
  dispatch.pub('colors.vim.sp', colors.sp)
}

r.mode_info_set = (_, infos: ModeInfo[]) => infos.forEach(async mi => {
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

r.mode_change = async mode => {
  dispatch.pub('vim:mode', mode)
  currentMode = mode
  const info = modes.get(mode)
  if (!info) return
  info.color && ui.setCursorColor(info.color)
  ui.setCursorShape(info.shape, info.size)
}

r.highlight_set = (attrs: Attrs) => {
  const fg = attrs.foreground ? asColor(attrs.foreground) : colors.fg
  const bg = attrs.background ? asColor(attrs.background) : colors.bg

  attrs.reverse
    ? merge(nextAttrs, attrs, { bg: fg, fg: bg })
    : merge(nextAttrs, attrs, { fg, bg })
}

r.scroll = amount => {
  amount > 0
    ? moveRegionUp(amount, lastScrollRegion || defaultScrollRegion())
    : moveRegionDown(-amount, lastScrollRegion || defaultScrollRegion())

  lastScrollRegion = null
}

r.put = str => {
  const total = str.length
  if (!total) return

  const win = getWindow(ui.cursor.row, ui.cursor.col)
  //// TODO: get all windows which apply for this range
  //or is it even an issue? aka always in range of window dimensions?
  //add check in canvas-window fillRect to see if out of bounds
  win && win
    .setColor(nextAttrs.bg)
    .fillRect(ui.cursor.col, ui.cursor.row, total, 1)
    .setColor(nextAttrs.fg)
    .setTextBaseline('top')

  for (let ix = 0; ix < total; ix++) {
    // TODO: short form if didn't work...
    // vertical split
    if (str[ix][0] === '\u2411') {}
    // horizontal split
    else if (str[ix][0] === '\u2412') {}

    // TODO: force set fillchars to these unicode chars (as to not render)
    // if current char is empty or a split (fillchar) do not render
    else if (str[ix][0] !== ' ') {
      //ui.fillText(str[ix][0], ui.cursor.col, ui.cursor.row)
      const w = getWindow(ui.cursor.row, ui.cursor.col)
      // TODO: window dimensions does not include bottom statusline. but it does vertical split chars?
      // should skip the fillchars check and just truncate windows that will have vert fillchars?
      // (because horizontal are already not included in window)
      if (!w) console.log(`no window for r${ui.cursor.row} c${ui.cursor.col}`)
      w && w.fillText(str[ix][0], ui.cursor.col, ui.cursor.row)
    }

    grid.set(ui.cursor.row, ui.cursor.col, str[ix][0], nextAttrs.fg, nextAttrs.bg)

    ui.cursor.col++
  }
}

r.popupmenu_hide = () => dispatch.pub('pmenu.hide')
r.popupmenu_select = (ix: number) => dispatch.pub('pmenu.select', ix)
r.popupmenu_show = (items: PMenuItem[], ix: number, row: number, col: number) =>
  dispatch.pub('pmenu.show', { items, ix, row, col })

r.tabline_update = (curtab: ExtContainer, tabs: ExtContainer[]) => dispatch.pub('tabs', { curtab, tabs })

r.wildmenu_show = items => dispatch.pub('wildmenu.show', items)
r.wildmenu_select = selected => dispatch.pub('wildmenu.select', selected)
r.wildmenu_hide = () => dispatch.pub('wildmenu.hide')

type CmdContent = [any, string]

export enum CommandType {
  Ex,
  SearchForward,
  SearchBackward,
}

export interface CommandUpdate {
  cmd: string,
  kind: CommandType,
  position: number,
}

r.cmdline_show = (content: CmdContent[], position, opChar, prompt, indent, level) => {
  // TODO: process attributes!
  const cmd = content.reduce((str, [ _, item ]) => str + item, '')

  const kind: CommandType = Reflect.get({
    ':': CommandType.Ex,
    '/': CommandType.SearchForward,
    '?': CommandType.SearchBackward,
  }, opChar) || CommandType.Ex

  dispatch.pub('cmd.update', { cmd, kind, position } as CommandUpdate)

  prompt && console.log('prompt?', prompt)
  indent && console.log('indent:', indent)
  level > 1 && console.log('level:', level)
}

r.cmdline_pos = position => dispatch.pub('cmd.update', { position })
r.cmdline_hide = () => dispatch.pub('cmd.hide')

onRedraw((m: any[]) => {
  const count = m.length
  for (let ix = 0; ix < count; ix++) {
    const [ method, ...args ] = m[ix]

    // TODO: should prioritize the main events (put, etc.) and process stuff like 'tabline' later
    const fn = api.get(method)
    if (fn) method === 'put' 
      ? fn(args)
      : args.forEach((a: any[]) => fn(...a))
  }

  lastScrollRegion = null
  ui.moveCursor()
  setImmediate(() => dispatch.pub('redraw'))
})
