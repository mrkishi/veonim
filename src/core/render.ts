import { onRedraw, getColor } from '../core/master-control'
import ui, { CursorShape } from '../core/canvasgrid'
import { Events, ExtContainer } from '../core/api'
//import NeovimUtils from '../support/neovim-utils'
import { asColor, merge } from '../support/utils'
import * as dispatch from '../messaging/dispatch'
//import { raw as neovim } from '../core/neovim'

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

//const { unblock } = NeovimUtils(neovim)
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
r.cursor_goto = (row, col) => merge(ui.cursor, { col, row })
r.eol_clear = () => ui.setColor(colors.bg).fillRect(ui.cursor.col, ui.cursor.row, ui.cols, 1)
r.set_scroll_region = (top, bottom, left, right) => lastScrollRegion = { top, bottom, left, right }

r.update_fg = fg => {
  if (fg < 0) return
  merge(colors, { fg: asColor(fg) })
  dispatch.pub('colors.vim.fg', colors.fg)
}

r.update_bg = bg => {
  if (bg < 0) return
  merge(colors, { bg: asColor(bg) })
  dispatch.pub('colors.vim.bg', colors.bg)
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

  ui
    .setColor(nextAttrs.bg)
    .fillRect(ui.cursor.col, ui.cursor.row, total, 1)
    .setColor(nextAttrs.fg)
    .setTextBaseline('top')

  for (let ix = 0; ix < total; ix++) {
    if (str[ix][0] !== ' ') ui.fillText(str[ix][0], ui.cursor.col, ui.cursor.row)
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

  // TODO: wtf is with this '...' shenanigans when hitting <Tab> or <ctrl-a> appearing in the
  // command output line (bottom of the screen?)

  prompt && console.log('prompt?', prompt)
  indent && console.log('indent:', indent)
  level > 1 && console.log('level:', level)
}

r.cmdline_pos = position => dispatch.pub('cmd.update', { position })

r.cmdline_hide = async () => {
  dispatch.pub('cmd.hide')
  // TODO: so i'm thinking... after this happens, pause and buffer all render updates
  // on complete, if any errors, discard render output and show notification with errors
  // if ok, render stuff that was buffered from the last line, into... what? some gui thing
  //
  //if multi-line, then i guess we would need to calculate the size of the window, subtract
  //whatever is remaining + including the statusline. i think most of the time the cmd output
  //should be 1 row. (famous last words)
  //
  //what i want to do is hide the cmd_output window. eventually neovim will externalize this
  //so let's not get too clever here. some hackery is okay
  //
  //we could do this as a temp thing just to render the grid size taller by row + 1
  //this way the last row will be out of bounds. but actually we will not render any shit
  //in the last row. 
  //just we will capture output and figure out a way to display it in the gui
  //const errors = await unblock()

  //if (errors.length) dispatch.pub('notification:error', {
    //title: 'wtf r u doin m8',
    //message: errors,
  //})
}

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
})
