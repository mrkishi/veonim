import { moveCursor, cursor, CursorShape, setCursorColor, setCursorShape } from '../core/cursor'
import { asColor, merge, matchOn, CreateTask, debounce, is } from '../support/utils'
import { onRedraw, getColor, getMode } from '../core/master-control'
import { EMPTY_CHAR, EMPTY_HIGHLIGHT } from '../support/constants'
import { getWindow, applyToWindows } from '../core/windows'
import * as canvasContainer from '../core/canvas-container'
import { NotifyKind, notify } from '../ui/notifications'
import { Events, ExtContainer } from '../core/api'
import * as dispatch from '../messaging/dispatch'
import $, { VimMode } from '../core/state'
import fontAtlas from '../core/font-atlas'
import * as grid from '../core/the-grid'
import { setWindow, setWindowGridSize } from '../core/windows2'

type NotificationKind = 'error' | 'warning' | 'info' | 'success' | 'hidden' | 'system'

interface GridInfo {
  windowId: number
  gridId: number
  row: number
  col: number
  width: number
  height: number
}

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
  foreground?: number
  background?: number
  special?: number
  reverse?: string
  italic?: string
  bold?: string
  underline?: boolean
  undercurl?: boolean
  cterm_fg?: number
  cterm_bg?: number
}

interface NextAttrs extends Attrs {
  fg: string,
  bg: string,
  sp: string,
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

type CmdContent = [any, string]

export enum CommandType {
  Ex,
  Prompt,
  SearchForward,
  SearchBackward,
}

export interface CommandUpdate {
  cmd: string,
  kind: CommandType,
  position: number,
}

interface CommandLineCache {
  cmd?: string,
  active: boolean,
  position: number,
}

let lastScrollRegion: ScrollRegion | null = null
let currentMode: string
const commonColors = new Map<string, number>()

const recordColor = (color: string) => {
  const count = commonColors.get(color) || 0
  commonColors.set(color, count + 1)
}

const getTopColors = (amount = 16) => Array
  .from(commonColors.entries())
  .sort((a, b) => a[1] < b[1] ? 1 : -1)
  .slice(0, amount)
  .map(m => m[0])

const cmdcache: CommandLineCache = {
  active: false,
  position: -999,
}

const attrDefaults: Attrs = {
  underline: false,
  undercurl: false
}

const normalizeVimMode = (mode: string): VimMode => {
  if (mode === 't') return VimMode.Terminal
  if (mode === 'n' || mode === 'normal') return VimMode.Normal
  if (mode === 'i' || mode === 'insert') return VimMode.Insert
  if (mode === 'V' || mode === 'visual') return VimMode.Visual
  if (mode === 'R' || mode === 'replace') return VimMode.Replace
  if (mode === 'no' || mode === 'operator') return VimMode.Operator
  if (mode === 'c' || mode === 'cmdline_normal') return VimMode.CommandNormal
  if (mode === 'cmdline_insert') return VimMode.CommandInsert
  if (mode === 'cmdline_replace') return VimMode.CommandReplace
  // there are quite a few more modes available. see `mode_info_set`
  else return VimMode.SomeModeThatIProbablyDontCareAbout
}

const api = new Map<string, Function>()
const modes = new Map<string, Mode>()
const options = new Map<string, any>()
const highlights = new Map<number, Attrs>()
const gridInfo = new Map<number, GridInfo>()

// because a Map is higher perf than an object
const r: Events = new Proxy(api, {
  set: (_: any, name, fn) => (api.set(name as string, fn), true)
})

const colors: Colors = {
  fg: '#dddddd',
  bg: '#2d2d2d',
  sp: '#ef5188'
}

const nextAttrs: NextAttrs = {
  fg: colors.fg,
  bg: colors.bg,
  sp: colors.sp,
}

const cursorShapeType = (shape?: string) => {
  if (shape === 'block') return CursorShape.block
  if (shape === 'horizontal') return CursorShape.underline
  if (shape === 'vertical') return CursorShape.line
  else return CursorShape.block
}

const moveRegionUp = (id: number, amount: number, { top, bottom, left, right }: ScrollRegion) => {
  const w = getWindow(top, left)
  const width = right - left + 1
  const height = bottom - (top + amount) + 1

  const region = {
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
  }

  w && w
    .moveRegion(region)
    .setColor(colors.bg)
    .fillRect(left, bottom - amount + 1, right - left + 1, amount)

  grid.moveRegionUp(id, amount, top, bottom, left, right)
}

const moveRegionDown = (id: number, amount: number, { top, bottom, left, right }: ScrollRegion) => {
  const w = getWindow(top, left)
  const width = right - left + 1
  const height = bottom - (top + amount) + 1

  const region = {
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
  }

  w && w
    .moveRegion(region)
    .setColor(colors.bg)
    .fillRect(left, top, right - left + 1, amount)

  grid.moveRegionDown(id, amount, top, bottom, left, right)
}

r.option_set = (key, value) => options.set(key, value)

r.default_colors_set = (fg, bg, sp) => {
  merge(colors, {
    fg: asColor(fg),
    bg: asColor(bg),
    sp: asColor(sp),
  })

  dispatch.pub('colors.vim.fg', colors.fg)
  dispatch.pub('colors.vim.bg', colors.bg)
  dispatch.pub('colors.vim.sp', colors.sp)

  $.foreground = colors.fg
  $.background = colors.bg
  $.special = colors.sp
}

r.mode_info_set = (_, infos: ModeInfo[]) => infos.forEach(async mi => {
  const info = {
    shape: cursorShapeType(mi.cursor_shape),
    size: mi.cell_percentage
  }

  if (mi.hl_id) {
    const { bg } = await getColor(mi.hl_id)
    merge(info, { color: bg || colors.fg })
    if (mi.name === currentMode && bg) {
      setCursorColor(bg)
      setCursorShape(info.shape, info.size)
    }
  }

  modes.set(mi.name, info)
})

r.mode_change = async mode => {
  dispatch.pub('vim:mode', mode)
  $.mode = normalizeVimMode(mode)
  currentMode = mode
  const info = modes.get(mode)
  if (!info) return
  info.color && setCursorColor(info.color)
  setCursorShape(info.shape, info.size)
}

// TODO: info
r.hl_attr_define = (id, attrs: Attrs, info) => highlights.set(id, attrs)

r.grid_clear = id => {
  console.log('grid clear:', id)
  grid.clear(id)
}
r.grid_destroy = id => {
  console.log('grid destroy:', id)
  grid.destroy(id)
  gridInfo.delete(id)
}
// TODO: do we need to reset cursor position after resizing?
r.grid_resize = (id, width, height) => {
  console.log('RESIZE:', id, height, width)
  setWindowGridSize(id, width, height)
  grid.resize(id, height, width)
  // this may be redundant since win_position gets called before anyways
  const prev = gridInfo.get(id) || {}
  gridInfo.set(id, merge(prev, { width, height }))
}
// TODO: this will tell us which window the cursor belongs in. this means
// we don't need the whole get active window first before rendering
r.grid_cursor_goto = (id, row, col) => merge(cursor, { row, col })
r.grid_scroll = (id, top, bottom, left, right, amount) => amount > 0
  ? moveRegionUp(id, amount, { top, bottom, left, right })
  : moveRegionDown(id, -amount, { top, bottom, left, right })

r.grid_line = (id, row, startCol, charData: any[]) => {
  let col = startCol

  console.log('grid line:', id, row)
  charData
    .map(([ char, hlid, repeat = 1 ]) => ({ char, hlid, repeat }))
    .forEach(c => {
      if (c.char === EMPTY_CHAR) grid.clearLine(id, row, col, col + c.repeat)
      else if (c.repeat > 1) grid.setLine(id, row, col, col + c.repeat, c.char, c.hlid)
      else grid.set(id, row, col, c.char, c.hlid)

      col + c.repeat
    })
}

r.win_position = (windowId, gridId, row, col, width, height) => {
  setWindow(windowId, gridId, row, col, width, height)
  console.log(`W ${windowId} G ${gridId} - TOP: ${row} LEFT: ${col} WIDTH: ${width} HEIGHT: ${height}`)
  gridInfo.set(gridId, { windowId, gridId, row, col, width, height })
}

// r.highlight_set = (attrs: Attrs) => {
//   const fg = attrs.foreground ? asColor(attrs.foreground) : colors.fg
//   const bg = attrs.background ? asColor(attrs.background) : colors.bg
//   const sp = attrs.special ? asColor(attrs.special) : colors.sp

//   attrs.reverse
//     ? merge(nextAttrs, attrDefaults, attrs, { sp, bg: fg, fg: bg })
//     : merge(nextAttrs, attrDefaults, attrs, { sp, fg, bg })

//   recordColor(nextAttrs.fg)
// }


r.put = chars => {
  const total = chars.length
  if (!total) return

  const underlinePls = !!(nextAttrs.undercurl || nextAttrs.underline)
  const { row: ogRow, col: ogCol } = cursor
  const win = getWindow(cursor.row, cursor.col)
  //// TODO: get all windows which apply for this range
  //or is it even an issue? aka always in range of window dimensions?
  //add check in canvas-window fillRect to see if out of bounds
  win && win
    .setColor(nextAttrs.bg)
    .fillRect(cursor.col, cursor.row, total, 1)
    .setColor(nextAttrs.fg)
    .setTextBaseline('top')

  for (let ix = 0; ix < total; ix++) {
    if (chars[ix][0] !== ' ') {
      // TODO: can we get window valid for the given range instead of each lookup?
      const w = getWindow(cursor.row, cursor.col)
      w && w.fillText(chars[ix][0], cursor.col, cursor.row)
    }

    grid.set(cursor.row, cursor.col, chars[ix][0], nextAttrs.fg, nextAttrs.bg, underlinePls, nextAttrs.sp)

    cursor.col++
  }

  if (win && underlinePls) win.underline(ogCol, ogRow, total, nextAttrs.sp)
}

r.set_title = title => dispatch.pub('vim:title', title)

r.popupmenu_hide = () => dispatch.pub('pmenu.hide')
r.popupmenu_select = (ix: number) => dispatch.pub('pmenu.select', ix)
r.popupmenu_show = (items: PMenuItem[], ix: number, row: number, col: number) =>
  dispatch.pub('pmenu.show', { items, ix, row, col })

r.tabline_update = (curtab: ExtContainer, tabs: ExtContainer[]) => dispatch.pub('tabs', { curtab, tabs })

r.wildmenu_show = items => dispatch.pub('wildmenu.show', items)
r.wildmenu_select = selected => dispatch.pub('wildmenu.select', selected)
r.wildmenu_hide = () => dispatch.pub('wildmenu.hide')

r.cmdline_show = (content: CmdContent[], position, opChar, prompt, indent, level) => {
  cmdcache.active = true
  cmdcache.position = position

  // TODO: process attributes!
  const cmd = content.reduce((str, [ _, item ]) => str + item, '')
  if (cmdcache.cmd === cmd) return
  cmdcache.cmd = cmd

  const kind: CommandType = Reflect.get({
    ':': CommandType.Ex,
    '/': CommandType.SearchForward,
    '?': CommandType.SearchBackward,
  }, opChar) || CommandType.Ex

  const cmdPrompt = kind === CommandType.Ex
  const searchPrompt = kind === CommandType.SearchForward || kind === CommandType.SearchBackward

  cmdPrompt && dispatch.pub('cmd.update', {
    cmd,
    kind: prompt ? CommandType.Prompt : kind,
    position
  } as CommandUpdate)

  searchPrompt && dispatch.pub('search.update', {
    cmd,
    kind: prompt ? CommandType.Prompt : kind,
    position
  } as CommandUpdate)

  // TODO: do the indentings thingies
  indent && console.log('indent:', indent)
  level > 1 && console.log('level:', level)
}

r.cmdline_hide = () => {
  merge(cmdcache, { active: false, position: -999, cmd: undefined })
  // TODO: how to only call one instead of both? since only one can be up
  // at a time?
  dispatch.pub('cmd.hide')
  dispatch.pub('search.hide' )
}

r.cmdline_pos = position => {
  // TODO: how to only call one instead of both?
  dispatch.pub('cmd.update', { position })
  dispatch.pub('search.update', { position })
}

// from neovim PR 7466:
// Multiple msg_chunk calls build up a msg line, msg_end tells the line is finished.
// msg_start_kind(...) tells the kind for some kinds of messages, but clients should be 
// prepared msg_chunk:s come without a msg_start_kind(). msg_showcmd([attrs, text]) works 
// independently of all other events.

const msgKinds = new Map<string, NotificationKind>([
  ['emsg', 'error'],
  ['echo', 'info'],
  ['echomsg', 'info'],
])

const message = {
  buffer: '',
  kind: 'info' as NotificationKind,
}

const resetMsg = () => {
  message.buffer = ''
  setTimeout(() => message.kind = 'hidden', 1)
}

// r.msg_start_kind = kind => {
//   if (msgKinds.has(kind)) message.kind = msgKinds.get(kind)!

//   else if (kind === 'showmode') setTimeout(() => {
//     if (message.buffer.includes('recording @')) {
//       const [ , register ] = message.buffer.match(/recording @(\w)/) || [] as string[]
//       dispatch.pub('vim:macro.start', register)
//     }
//   }, 30)

//   else console.log('new msg kind:', kind)
// }

// TODO: join or call foreach?
// r.msg_showcmd = (content = []) => notify(content.join(''))

// r.msg_chunk = data => message.buffer += data

// r.msg_end = () => {
//   // TODO: this only happens at startup, so maybe run this condition for a limitied period of time
//   // TODO: test without plugins!
//   if (message.buffer === '<') return resetMsg()
//   if (!message.kind) notify(message.buffer, NotifyKind.Hidden)

//   if (/recording @\w/.test(message.buffer)) return dispatch.pub('vim:macro.end')

//   matchOn(message.kind)({
//     [NotifyKind.Error]: () => notify(message.buffer, NotifyKind.Error),
//     [NotifyKind.Warning]: () => notify(message.buffer, NotifyKind.Warning),
//     [NotifyKind.Info]: () => notify(message.buffer, NotifyKind.Info),
//     [NotifyKind.Success]: () => notify(message.buffer, NotifyKind.Success),
//   })

//   resetMsg()
// }

let lastTop: string[] = []
let initialAtlasGenerated = false
const initalFontAtlas = CreateTask()

initalFontAtlas.promise.then(() => {
  fontAtlas.generate([ colors.fg ])
  initialAtlasGenerated = true
})

const sameColors = (colors: string[]) => colors.every(c => lastTop.includes(c))

const generateFontAtlas = () => {
  const topColors = getTopColors()
  const genColors = [...new Set([...topColors, colors.fg])]
  fontAtlas.generate(genColors)
}

const regenerateFontAtlastIfNecessary = debounce(() => {
  const topColors = getTopColors()
  if (!sameColors(topColors)) {
    const genColors = [...new Set([ ...topColors, colors.fg ])]
    fontAtlas.generate(genColors)
  }
  lastTop = topColors
}, 100)

const cmdlineIsSame = (...args: any[]) => cmdcache.active && cmdcache.position === args[1]

const doNotUpdateCmdlineIfSame = (args: any[]) => {
  if (!args || !is.array(args)) return false
  const [ cmd, data ] = args
  if (cmd !== 'cmdline_show') return false
  return cmdlineIsSame(...data)
}

onRedraw((m: any[]) => {
  // because of circular logic/infinite loop. cmdline_show updates UI, UI makes
  // a change in the cmdline, nvim sends redraw again. we cut that shit out
  // with coding and algorithms
  if (doNotUpdateCmdlineIfSame(m[0])) return

  const count = m.length
  for (let ix = 0; ix < count; ix++) {
    const [ method, ...args ] = m[ix]

    // TODO: should prioritize the main events (put, etc.) and process stuff like 'tabline' later
    const fn = api.get(method)
    if (fn) method === 'put' 
      ? fn(args)
      : args.forEach((a: any[]) => fn(...a))

    if (process.env.VEONIM_DEV && !fn) console.log(method, args)
  }

  // lastScrollRegion = null
  moveCursor(colors.bg)

  // gridInfo.forEach(m => console.log(`W ${m.windowId} G ${m.gridId} - TOP: ${m.row} LEFT: ${m.col} WIDTH: ${m.width} HEIGHT: ${m.height}`))

  // TODO: process:
  // win_position / grid_resize resize the canvas. do we have to redraw canvas on resize?
  // on grid_line/scroll/clear update canvas
  // when redraw event complete, recalc/layout/redraw the HTML window containers

  console.log('---')
  console.log(...[...gridInfo])

  dispatch.pub('collect-taxes')
  setImmediate(() => {
    // TODO: this spawns a bunch of window hacks. may need to re-enable, but probably
    // rework the windows logic bound to this event
    // dispatch.pub('redraw')
    // if (!initialAtlasGenerated) initalFontAtlas.done(true)
    // regenerateFontAtlastIfNecessary()
    getMode().then(m => $.mode = normalizeVimMode(m.mode))
  })
})

// canvasContainer.on('device-pixel-ratio-changed', generateFontAtlas)
