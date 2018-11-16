import { CursorShape, setCursorColor, setCursorShape } from '../core/cursor'
import { getBackground } from '../render/highlight-attributes'
import * as dispatch from '../messaging/dispatch'
import { VimMode } from '../neovim/types'
import nvim from '../core/neovim'

interface Mode {
  shape: CursorShape
  hlid?: number
  size?: number
}

interface ModeInfo {
  blinkoff?: number
  blinkon?: number
  blinkwait?: number
  cell_percentage?: number
  cursor_shape?: string
  attr_id?: number
  attr_id_lm?: number
  hl_id?: number
  id_lm?: number
  mouse_shape?: number
  name: string
  short_name: string
}

type CmdContent = [any, string]

interface PMenuItem {
  word: string,
  kind: string,
  menu: string,
  info: string,
}

interface CommandLineCache {
  cmd?: string
  active: boolean
  position: number
}

export enum CommandType {
  Ex,
  Prompt,
  SearchForward,
  SearchBackward,
}

export interface CommandUpdate {
  cmd: string
  kind: CommandType
  position: number
}

const modes = new Map<string, Mode>()
const options = new Map<string, any>()

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

const cursorShapeType = (shape?: string) => {
  if (shape === 'block') return CursorShape.block
  if (shape === 'horizontal') return CursorShape.underline
  if (shape === 'vertical') return CursorShape.line
  else return CursorShape.block
}

export const mode_change = ([ , [ mode ] ]: any) => {
  nvim.state.mode = normalizeVimMode(mode)
  const info = modes.get(mode)
  if (!info) return

  if (info.hlid) {
    const bg = getBackground(info.hlid)
    if (bg) setCursorColor(bg)
  }

  setCursorShape(info.shape, info.size)
}

export const option_set = ([ , [ key, value ] ]: any) => options.set(key, value)

export const mode_info_set = ([ , [ , infos ] ]: any) => infos.forEach((m: ModeInfo) => {
  const info = {
    shape: cursorShapeType(m.cursor_shape),
    size: m.cell_percentage,
    hlid: m.attr_id,
  }

  modes.set(m.name, info)
})

export const set_title = ([ , [ title ] ]: [any, [string]]) => dispatch.pub('vim:title', title)

export const popupmenu_hide = () => dispatch.pub('pmenu.hide')
export const popupmenu_select = ([ , [ ix ] ]: [any, [number]]) => dispatch.pub('pmenu.select', ix)
export const popupmenu_show = ([ , [ items, ix, row, col ] ]: [any, [PMenuItem[], number, number, number]]) => {
  dispatch.pub('pmenu.show', { items, ix, row, col })
}

export const wildmenu_show = ([ , [ items ] ]: any) => dispatch.pub('wildmenu.show', items)
export const wildmenu_hide = () => dispatch.pub('wildmenu.hide')
export const wildmenu_select = ([ , [ selected ] ]: [any, [number]]) => {
  dispatch.pub('wildmenu.select', selected)
}

const cmdlineIsSame = (...args: any[]) => cmdcache.active && cmdcache.position === args[1]

export const doNotUpdateCmdlineIfSame = (args: any[]) => {
  if (!args || !Array.isArray(args)) return false
  const [ cmd, data ] = args
  if (cmd !== 'cmdline_show') return false
  return cmdlineIsSame(...data)
}

let currentCommandMode: CommandType
const cmdcache: CommandLineCache = {
  active: false,
  position: -999,
}

type CmdlineShow = [ CmdContent[], number, string, string, number, number ]
export const cmdline_show = ([ , [content, position, opChar, prompt, indent, level] ]: [any, CmdlineShow]) => {
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

  currentCommandMode = kind

  const cmdPrompt = kind === CommandType.Ex
  const searchPrompt = kind === CommandType.SearchForward || kind === CommandType.SearchBackward

  if (cmdPrompt) dispatch.pub('cmd.update', {
    cmd,
    kind: prompt ? CommandType.Prompt : kind,
    position
  } as CommandUpdate)

  else if (searchPrompt) dispatch.pub('search.update', {
    cmd,
    kind: prompt ? CommandType.Prompt : kind,
    position
  } as CommandUpdate)

  // TODO: do the indentings thingies
  indent && console.log('indent:', indent)
  level > 1 && console.log('level:', level)
}

export const cmdline_hide = () => {
  Object.assign(cmdcache, { active: false, position: -999, cmd: undefined })
  dispatch.pub('cmd.hide')
  dispatch.pub('search.hide')
}

export const cmdline_pos = ([ , [ position ] ]: [any, [number]]) => {
  if (currentCommandMode === CommandType.Ex) dispatch.pub('cmd.update', { position })
  else dispatch.pub('search.update', { position })
}
