import { setWindow, removeWindow, getWindow, renderWindows, setActiveGrid, refreshWindows } from '../core/windows2'
import { moveCursor, cursor, CursorShape, setCursorColor, setCursorShape } from '../core/cursor'
import { onRedraw, getMode, getColor as getColorFromVim } from '../core/master-control'
import { asColor, merge, /*CreateTask, debounce,*/ is } from '../support/utils'
// import * as canvasContainer from '../core/canvas-container'
// import { NotifyKind, notify } from '../ui/notifications'
import { Events, ExtContainer } from '../core/api'
import { EMPTY_CHAR } from '../support/constants'
import * as dispatch from '../messaging/dispatch'
import $$, { VimMode } from '../core/state'
// import fontAtlas from '../core/font-atlas'

// type NotificationKind = 'error' | 'warning' | 'info' | 'success' | 'hidden' | 'system'

interface DefaultColors {
  foreground: string,
  background: string,
  special: string,
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

interface HighlightGroup {
  foreground?: string
  background?: string
  special?: string
  reverse: boolean
  italic: boolean
  bold: boolean
  underline: boolean
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

let currentMode: string
// const commonColors = new Map<string, number>()

// const recordColor = (color: string) => {
//   const count = commonColors.get(color) || 0
//   commonColors.set(color, count + 1)
// }

// const getTopColors = (amount = 16) => Array
//   .from(commonColors.entries())
//   .sort((a, b) => a[1] < b[1] ? 1 : -1)
//   .slice(0, amount)
//   .map(m => m[0])

const cmdcache: CommandLineCache = {
  active: false,
  position: -999,
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
const highlights = new Map<number, HighlightGroup>()

// because a Map is higher perf than an object
const r: Events = new Proxy(api, {
  set: (_: any, name, fn) => (api.set(name as string, fn), true)
})

const defaultColors: DefaultColors = {
  foreground: '#dddddd',
  background: '#2d2d2d',
  special: '#ef5188'
}

const cursorShapeType = (shape?: string) => {
  if (shape === 'block') return CursorShape.block
  if (shape === 'horizontal') return CursorShape.underline
  if (shape === 'vertical') return CursorShape.line
  else return CursorShape.block
}

const getHighlightGroup = (hlid: number) => {
  const hlgrp = highlights.get(hlid)
  if (!hlgrp) throw new Error(`could not get highlight group ${hlid}`)
  return hlgrp
}

const getColor = {
  bg: (hlgrp: HighlightGroup) => hlgrp.reverse
    ? hlgrp.foreground || defaultColors.foreground
    : hlgrp.background || defaultColors.background,
  fg: (hlgrp: HighlightGroup) => hlgrp.reverse
    ? hlgrp.background || defaultColors.background
    : hlgrp.foreground || defaultColors.foreground,
  sp: (hlgrp: HighlightGroup) => hlgrp.special || defaultColors.special,
}

const moveRegionUp = (id: number, amount: number, { top, bottom, left, right }: ScrollRegion) => {
  const { grid, canvas } = getWindow(id)
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

  canvas
    .moveRegion(region)
    .setColor(defaultColors.background)
    .fillRect(left, bottom - amount, right - left + 1, amount)

  grid.moveRegionUp(amount, top, bottom, left, right)
}

const moveRegionDown = (id: number, amount: number, { top, bottom, left, right }: ScrollRegion) => {
  const { grid, canvas } = getWindow(id)
  const width = right - left + 1
  const height = bottom - (top + amount)

  const region = {
    width,
    height,
    source: {
      col: left,
      row: top,
    },
    destination: {
      col: left,
      row: top + amount,
    }
  }

  canvas
    .moveRegion(region)
    .setColor(defaultColors.background)
    .fillRect(left, top, right - left + 1, amount)

  grid.moveRegionDown(amount, top, bottom, left, right)
}

// grid: 1 is the global grid - not used with ext_multigrid
const checkSkipDefaultGrid = (id: number) => id === 1

r.option_set = (key, value) => options.set(key, value)

r.default_colors_set = (fg, bg, sp) => {
  merge(defaultColors, {
    foreground: asColor(fg),
    background: asColor(bg),
    special: asColor(sp),
  })

  dispatch.pub('colors.vim.fg', defaultColors.foreground)
  dispatch.pub('colors.vim.bg', defaultColors.background)
  dispatch.pub('colors.vim.sp', defaultColors.special)

  $$.foreground = defaultColors.foreground
  $$.background = defaultColors.background
  $$.special = defaultColors.special

  // hlid 0 -> default highlight group
  highlights.set(0, {
    foreground: defaultColors.foreground,
    background: defaultColors.background,
    special: defaultColors.special,
    underline: false,
    reverse: false,
    italic: false,
    bold: false,
  })
}

r.mode_info_set = (_, infos: ModeInfo[]) => infos.forEach(async mi => {
  const info = {
    shape: cursorShapeType(mi.cursor_shape),
    size: mi.cell_percentage
  }

  if (mi.hl_id) {
    const { bg } = await getColorFromVim(mi.hl_id)
    merge(info, { color: bg || defaultColors.foreground })
    if (mi.name === currentMode && bg) {
      setCursorColor(bg)
      setCursorShape(info.shape, info.size)
    }
  }

  modes.set(mi.name, info)
})

r.mode_change = async mode => {
  dispatch.pub('vim:mode', mode)
  $$.mode = normalizeVimMode(mode)
  currentMode = mode
  const info = modes.get(mode)
  if (!info) return
  info.color && setCursorColor(info.color)
  setCursorShape(info.shape, info.size)
}

// TODO: info - store the HighlightGroup name somewhere
// this can be used to lookup items in the grid, for example:
// find all positions where a char(s) start with Search hlgrp
r.hl_attr_define = (id, attrs: Attrs, /*info*/) => highlights.set(id, {
  foreground: asColor(attrs.foreground),
  background: asColor(attrs.background),
  special: asColor(attrs.special),
  underline: !!(attrs.underline || attrs.undercurl),
  reverse: !!attrs.reverse,
  italic: !!attrs.italic,
  bold: !!attrs.bold,
})


r.grid_clear = id => {
  console.log('clear', id)
  if (checkSkipDefaultGrid(id)) return
  const { grid, canvas } = getWindow(id)
  grid.clear()
  canvas.clear()
}

r.grid_destroy = id => {
  console.log('destroy', id)
  if (checkSkipDefaultGrid(id)) return
  removeWindow(id)
}

// TODO: do we need to reset cursor position after resizing?
r.grid_resize = (id, width, height) => {
  console.log(`resize(grid: ${id}, width: ${width}, height: ${height})`)
  if (checkSkipDefaultGrid(id)) return
  getWindow(id).resizeWindow(width, height)
}

r.grid_cursor_goto = (id, row, col) => {
  setActiveGrid(id, row, col)
  merge(cursor, { row, col })
}

r.grid_scroll = (id, top, bottom, left, right, amount) => amount > 0
  ? moveRegionUp(id, amount, { top, bottom, left, right })
  : moveRegionDown(id, -amount, { top, bottom, left, right })

r.grid_line = (id, row, startCol, charData: any[]) => {
  if (checkSkipDefaultGrid(id)) return

  const { canvas, grid } = getWindow(id)
  const cellCount = charData.length
  let col = startCol
  let lastHlid = 0

  for (let ix = 0; ix < cellCount; ix++) {
    const [ char, hlid, repeat = 1 ] = charData[ix]

    const hlidExists = typeof hlid === 'number'
    const validHlid = hlidExists ? hlid : lastHlid
    const hlgrp = getHighlightGroup(validHlid)
    if (hlidExists) lastHlid = hlid

    if (char === EMPTY_CHAR) {
      canvas
        .setColor(getColor.bg(hlgrp))
        .fillRect(col, row, repeat, 1)

      grid.clearLine(row, col, col + repeat)
    }

    else if (repeat > 1) {
      canvas
        .setColor(getColor.bg(hlgrp))
        .fillRect(col, row, repeat, 1)
        .setColor(getColor.fg(hlgrp))

      for (let ix = 0; ix < repeat; ix++) canvas.fillText(char, col + ix, row)
      if (hlgrp.underline) canvas.underline(col, row, repeat, getColor.sp(hlgrp))

      grid.setLine(row, col, col + repeat, char, validHlid)
    }

    else {
      canvas
        .setColor(getColor.bg(hlgrp))
        .fillRect(col, row, 1, 1)
        .setColor(getColor.fg(hlgrp))
        .fillText(char, col, row)

      if (hlgrp.underline) canvas.underline(col, row, 1, getColor.sp(hlgrp))

      grid.setCell(row, col, char, validHlid)
    }

    col += repeat
  }
}

r.win_position = (windowId, gridId, row, col, width, height) => {
  console.log(`win_position(win: ${windowId}, grid: ${gridId}, top: ${row}, left: ${col}, width: ${width}, height: ${height})`)
  setWindow(windowId, gridId, row, col, width, height)
}

r.set_title = title => dispatch.pub('vim:title', title)

r.popupmenu_hide = () => dispatch.pub('pmenu.hide')
r.popupmenu_select = (ix: number) => dispatch.pub('pmenu.select', ix)
r.popupmenu_show = (items: PMenuItem[], ix: number, row: number, col: number) =>
  dispatch.pub('pmenu.show', { items, ix, row, col })

r.tabline_update = (curtab: ExtContainer, tabs: ExtContainer[]) => (window as any).requestIdleCallback(() => {
  dispatch.pub('tabs', { curtab, tabs })
})

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

// const msgKinds = new Map<string, NotificationKind>([
//   ['emsg', 'error'],
//   ['echo', 'info'],
//   ['echomsg', 'info'],
// ])

// const message = {
//   buffer: '',
//   kind: 'info' as NotificationKind,
// }

// const resetMsg = () => {
//   message.buffer = ''
//   setTimeout(() => message.kind = 'hidden', 1)
// }

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

// let lastTop: string[] = []
// let initialAtlasGenerated = false
// const initalFontAtlas = CreateTask()

// initalFontAtlas.promise.then(() => {
//   fontAtlas.generate([ colors.fg ])
//   initialAtlasGenerated = true
// })

// const sameColors = (colors: string[]) => colors.every(c => lastTop.includes(c))

// const generateFontAtlas = () => {
//   const topColors = getTopColors()
//   const genColors = [...new Set([...topColors, colors.fg])]
//   fontAtlas.generate(genColors)
// }

// const regenerateFontAtlastIfNecessary = debounce(() => {
//   const topColors = getTopColors()
//   if (!sameColors(topColors)) {
//     const genColors = [...new Set([ ...topColors, colors.fg ])]
//     fontAtlas.generate(genColors)
//   }
//   lastTop = topColors
// }, 100)

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
  let winUpdates = false

  const count = m.length
  for (let ix = 0; ix < count; ix++) {
    const [ method, ...args ] = m[ix]
    if (method === 'win_position') winUpdates = true
    const fn = api.get(method)
    if (!fn) continue

    const argCount = args.length
    for (let iy = 0; iy < argCount; iy++) fn(...args[iy])
  }

  moveCursor(defaultColors.background)
  if (winUpdates) requestAnimationFrame(() => renderWindows())

  ;(window as any).requestIdleCallback(() => {
    refreshWindows()
    // TODO: re-enable font atlas generation once the dust settles
    // if (!initialAtlasGenerated) initalFontAtlas.done(true)
    // regenerateFontAtlastIfNecessary()
    getMode().then(m => $$.mode = normalizeVimMode(m.mode))
  })
})

// canvasContainer.on('device-pixel-ratio-changed', generateFontAtlas)
