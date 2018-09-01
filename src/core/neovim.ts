import { VimMode, VimEvent, HyperspaceCoordinates, BufferType, BufferHide,
  BufferOption, Color, Buffer, Window, Tabpage, GenericCallback } from '../neovim/types'
import { Api, ExtContainer, Prefixes, Buffer as IBuffer, Window as IWindow, Tabpage as ITabpage } from '../core/api'
import { asColor, is, onFnCall, Watchers, prefixWith, uuid } from '../support/utils'
import { onCreateVim, onSwitchVim } from '../core/sessions'
import { SHADOW_BUFFER_TYPE } from '../support/constants'
import currentVim, { watch } from '../neovim/state'
import { Functions } from '../core/vim-functions'
import { Autocmds } from '../core/vim-startup'
import { Patch } from '../langserv/patch'
import setupRPC from '../messaging/rpc'
import vimState from '../neovim/state'
import { EventEmitter } from 'events'

const prefix = {
  core: prefixWith(Prefixes.Core),
  buffer: prefixWith(Prefixes.Buffer),
  window: prefixWith(Prefixes.Window),
  tabpage: prefixWith(Prefixes.Tabpage),
}

const registeredEventActions = new Set<string>()
const events = new Watchers()
const actionWatchers = new Watchers()
const autocmdWatchers = new EventEmitter()
const io = new Worker(`${__dirname}/../workers/neovim-client.js`)
const { notify, request, on: onEvent, hasEvent, onData } = setupRPC(m => io.postMessage(m))
// TODO: maybe this can be a global event system? add more than just autocmds
// debug-start, mode-change, etc.
export const notifyEvent = (event: keyof VimEvent) => events.notify(event, currentVim)

io.onmessage = ({ data: [kind, data] }: MessageEvent) => onData(kind, data)

onCreateVim(info => io.postMessage([65, info]))
onSwitchVim(id => io.postMessage([66, id]))

const req = {
  core: onFnCall((name: string, args: any[] = []) => request(prefix.core(name), args)) as Api,
  buf: onFnCall((name: string, args: any[] = []) => request(prefix.buffer(name), args)) as IBuffer,
  win: onFnCall((name: string, args: any[] = []) => request(prefix.window(name), args)) as IWindow,
  tab: onFnCall((name: string, args: any[] = []) => request(prefix.tabpage(name), args)) as ITabpage,
}

const api = {
  core: onFnCall((name: string, args: any[]) => notify(prefix.core(name), args)) as Api,
  buf: onFnCall((name: string, args: any[]) => notify(prefix.buffer(name), args)) as IBuffer,
  win: onFnCall((name: string, args: any[]) => notify(prefix.window(name), args)) as IWindow,
  tab: onFnCall((name: string, args: any[]) => notify(prefix.tabpage(name), args)) as ITabpage,
}

// trying to do dynamic introspection (obj vs arr) messy with typings. (also a bit slower)
const as = {
  buf: (p: Promise<ExtContainer>): Promise<Buffer> => p.then(e => Buffer(e.id)),
  bufl: (p: Promise<ExtContainer[]>): Promise<Buffer[]> => p.then(m => m.map(e => Buffer(e.id))),
  win: (p: Promise<ExtContainer>): Promise<Window> => p.then(e => Window(e.id)),
  winl: (p: Promise<ExtContainer[]>): Promise<Window[]> => p.then(m => m.map(e => Window(e.id))),
  tab: (p: Promise<ExtContainer>): Promise<Tabpage> => p.then(e => Tabpage(e.id)),
  tabl: (p: Promise<ExtContainer[]>): Promise<Tabpage[]> => p.then(m => m.map(e => Tabpage(e.id))),
}

const subscribe = (event: string, fn: (data: any) => void) => {
  if (!hasEvent(event)) onEvent(event, fn)
  api.core.subscribe(event)
}

export const cmd = (command: string) => api.core.command(command)
export const cmdOut = (command: string) => req.core.commandOutput(command)
export const expr = (expression: string) => req.core.eval(expression)
export const call: Functions = onFnCall((name, args) => req.core.callFunction(name, args))
export const feedkeys = (keys: string, mode = 'm', escapeCSI = false) => req.core.feedkeys(keys, mode, escapeCSI)
export const normal = (keys: string) => cmd(`norm! "${keys.replace(/"/g, '\\"')}"`)
export const callAtomic = (calls: any[]) => req.core.callAtomic(calls)
export const action = (event: string, cb: GenericCallback): void => {
  actionWatchers.add(event, cb)
  registeredEventActions.add(event)
  cmd(`let g:vn_cmd_completions .= "${event}\\n"`)
}
export const getCurrentLine = () => req.core.getCurrentLine()

const getNamedBuffers = async () => {
  const buffers = await list.buffers
  return Promise.all(buffers.map(async b => ({
    buffer: b,
    name: await b.name,
  })))
}

const findBuffer = async (name: string) => {
  const buffers = await getNamedBuffers()
  // it appears that buffers name will have a fullpath, like
  // `/Users/anna/${name}` so we will try to substring match 
  // the end of the name
  const found = buffers.find(b => b.name.endsWith(name)) || {} as any
  return found.buffer
}

const loadBuffer = async (file: string): Promise<boolean> => {
  const targetBuffer = await findBuffer(file)
  if (!targetBuffer) return false

  api.core.setCurrentBuf(targetBuffer.id)
  return true
}

export const openBuffer = async (file: string): Promise<boolean> => {
  const loaded = await loadBuffer(file)
  if (loaded) return true

  cmd(`badd ${file}`)
  return loadBuffer(file)
}

export const addBuffer = async (name: string): Promise<Buffer> => {
  const id = uuid()
  cmd(`badd ${id}`)

  const buffer = await findBuffer(id)
  if (!buffer) throw new Error(`addBuffer: could not find buffer '${id}' added with :badd ${name}`)

  // for some reason, buf.setName creates a new buffer? lolwut?
  // so it's probably still better to do the shenanigans above
  // since finding the buffer by uuid is more accurate instead
  // of trying to get a buffer handle by name only alone
  //
  // after a future neovim PR we might consider using 'nvim_create_buf'
  await buffer.setName(name)
  cmd(`bwipeout! ${id}`)
  return buffer
}

export const createShadowBuffer = async (name: string) => {
  const buffer = await addBuffer(name)

  buffer.setOption(BufferOption.Type, BufferType.NonFile)
  buffer.setOption(BufferOption.Hidden, BufferHide.Hide)
  buffer.setOption(BufferOption.Listed, false)
  buffer.setOption(BufferOption.Modifiable, false)
  buffer.setOption(BufferOption.Filetype, SHADOW_BUFFER_TYPE)

  return buffer
}

type JumpOpts = HyperspaceCoordinates & { openBufferFirst: boolean }

const jumpToPositionInFile = async ({ line, path, column, openBufferFirst }: JumpOpts) => {
  if (openBufferFirst && path) await openBuffer(path)
  // nvim_win_set_cursor params
  // line: 1-index based
  // column: 0-index based
  current.window.setCursor(line + 1, column || 0)
}

export const jumpTo = async ({ line, column, path }: HyperspaceCoordinates) => {
  const bufferLoaded = path ? path === currentVim.absoluteFilepath : true
  jumpToPositionInFile({ line, column, path, openBufferFirst: !bufferLoaded })
}

// the reason this method exists is because opening buffers with an absolute path
// will have the abs path in names and buffer lists. idk, it just behaves wierdly
// so it's much easier to open a file realtive to the current project (:cd/:pwd)
export const jumpToProjectFile = async ({ line, column, path }: HyperspaceCoordinates) => {
  const bufferLoaded = path ? path === currentVim.file : true
  jumpToPositionInFile({ line, column, path, openBufferFirst: !bufferLoaded })
}

export const openFile = async (fullpath: string) => {
  return fullpath !== currentVim.absoluteFilepath && openBuffer(fullpath)
}

// TODO: the new ui protocol sends along all highlight groups right? maybe we don't
// event need this func anymore
export const getColor = async (name: string) => {
  const { foreground: fg, background: bg } = await req.core.getHlByName(name, true) as Color
  return {
    foreground: asColor(fg || 0),
    background: asColor(bg || 0),
  }
}

export const systemAction = (event: string, cb: GenericCallback) => actionWatchers.add(event, cb)

// TODO: combine/collapse this with buffers.list / buffers.add / buffers.open, etc?
export const list = {
  get buffers() { return as.bufl(req.core.listBufs()) },
  get windows() { return as.winl(req.core.listWins()) },
  get tabs() { return as.tabl(req.core.listTabpages()) },
}

export const current = {
  get buffer(): Buffer {
    const bufferPromise = as.buf(req.core.getCurrentBuf())

    return onFnCall<Buffer>(async (fnName: string, args: any[]) => {
      const buf = await bufferPromise
      const fn = Reflect.get(buf, fnName)
      if (!fn) throw new TypeError(`${fnName} does not exist on Neovim.Buffer`)
      return fn(...args)
    })
  },
  get window(): Window {
    const windowPromise = as.win(req.core.getCurrentWin())

    return onFnCall<Window>(async (fnName: string, args: any[]) => {
      const win = await windowPromise
      const fn = Reflect.get(win, fnName)
      if (!fn) throw new TypeError(`${fnName} does not exist on Neovim.Window`)
      return fn(...args)
    })
  },
  get tabpage(): Tabpage {
    const tabpagePromise = as.tab(req.core.getCurrentTabpage())

    return onFnCall<Tabpage>(async (fnName: string, args: any[]) => {
      const tab = await tabpagePromise
      const fn = Reflect.get(tab, fnName)
      if (!fn) throw new TypeError(`${fnName} does not exist on Neovim.Tabpage`)
      return fn(...args)
    })
  },
}

export const getCurrent = {
  // TODO: merge these in 'current' api?
  get buffer() { return as.buf(req.core.getCurrentBuf()) },
}

const emptyObject: { [index: string]: any } = Object.create(null)
export const g = new Proxy(emptyObject, {
  get: async (_t, name: string) => {
    const val = await req.core.getVar(name as string).catch(e => e)
    return Array.isArray(val) && /Key (.*?)not found/.test(val[1]) ? undefined : val
  },
  set: (_t, name: string, val: any) => (api.core.setVar(name, val), true),
})

type Autocmd = { [Key in Autocmds]: (fn: (arg?: any) => void) => void }
const autocmd: Autocmd = new Proxy(Object.create(null), {
  get: (_, event: string) => (fn: any) => autocmdWatchers.on(event, fn)
})

export const on: VimEvent = onFnCall((name, [cb]) => events.add(name, cb))

export const applyPatches = async (patches: Patch[]) => {
  const buffers = await Promise.all((await list.buffers).map(async buffer => ({
    buffer,
    path: await buffer.name,
  })))

  // TODO: this assumes all missing files are in the cwd
  // TODO: badd allows the option of specifying a line number to position the curosr
  // when loading the buffer. might be nice to use on a rename op. see :h badd

  // TODO: we should notify user that other files were changed
  patches
    .filter(p => buffers.some(b => b.path !== p.path))
    .forEach(b => cmd(`badd ${b.file}`))

  applyPatchesToBuffers(patches, buffers)
}

interface PathBuf { buffer: Buffer, path: string }
const applyPatchesToBuffers = async (patches: Patch[], buffers: PathBuf[]) => buffers.forEach(({ buffer, path }) => {
  const patch = patches.find(p => p.path === path)
  if (!patch) return

  patch.operations.forEach(async ({ op, start, end, val }, ix) => {
    if (op === 'delete') buffer.delete(start.line)
    else if (op === 'append') buffer.append(start.line, val)
    else if (op === 'replace') {
      const targetLine = await buffer.getLine(start.line)
      const newLine = targetLine.slice(0, start.character) + val + targetLine.slice(end.character)
      buffer.replace(start.line, newLine)
    }

    if (!ix) cmd('undojoin')
  })
})

// TODO: this is not deterministic, it mutates global state...
// maybe we can move this to postStsartupCmds. that way nvim
// pushes out buffered actions instead of pulling.
// still have issue that it's a one-time mutation tho.
// maybe any buffered notifications only needed for main thread anyways
const processBufferedActions = async () => {
  const bufferedActions = await g.vn_rpc_buf
  if (!bufferedActions.length) return
  bufferedActions.forEach(([event, ...args]) => actionWatchers.notify(event, ...args))
  g.vn_rpc_buf = []
}

// nvim does not currently have TermEnter/TermLeave autocmds - it might in the future
// TODO: revisit this once we get THE-GRID. do we still have the term cursor bug?
watch.mode(mode => {
  if (mode === VimMode.Terminal) return notifyEvent('termEnter')
  if (currentVim.bufferType === BufferType.Terminal && mode === VimMode.Normal) notifyEvent('termLeave')
})

const refreshState = async () => {
  const nextState = await call.VeonimState()
  Object.assign(vimState, nextState)
}

onCreateVim(() => {
  const events = [...registeredEventActions.values()].join('\\n')
  cmd(`let g:vn_cmd_completions .= "${events}\\n"`)

  subscribe('veonim', ([ event, args = [] ]) => actionWatchers.notify(event, ...args))
  subscribe('veonim-state', ([ state ]) => Object.assign(vimState, state))
  subscribe('veonim-position', ([ position ]) => Object.assign(vimState, position))
  subscribe('veonim-autocmd', ([ autocmd, arg ]) => autocmdWatchers.emit(autocmd, arg))

  processBufferedActions()
  refreshState()
  notifyEvent('bufLoad')
})

onSwitchVim(() => {
  refreshState()
  notifyEvent('bufLoad')
})

autocmd.CompleteDone(word => events.notify('completion', word, currentVim))

autocmd.BufAdd(() => notifyEvent('bufAdd'))
autocmd.BufEnter(() => notifyEvent('bufLoad'))
autocmd.BufDelete(() => notifyEvent('bufUnload'))
autocmd.BufWritePost(() => notifyEvent('bufWrite'))

// TODO: can we get rid of these?
autocmd.InsertEnter(() => notifyEvent('insertEnter'))
autocmd.InsertLeave(() => notifyEvent('insertLeave'))

// TODO: would like to abstract this buffer change stuff away into a cleaner
// solution especially since we now have buffer change notifications in nvim
autocmd.TextChanged(() => notifyEvent('bufChange'))
let lastRevision: number
autocmd.CursorMovedI(async () => {
  const prevRevision = lastRevision
  const currentRevision = await expr(`b:changedtick`)
  lastRevision = currentRevision

  if (prevRevision !== currentRevision) notifyEvent('bufChangeInsert')
  // TODO: do we need that last argument there???
  events.notify('cursorMoveInsert', prevRevision !== currentVim.revision, currentVim)
})

const HL_CLR = 'nvim_buf_clear_highlight'
const HL_ADD = 'nvim_buf_add_highlight'

const Buffer = (id: any) => ({
  id,
  get number() { return req.buf.getNumber(id) },
  get valid() { return req.buf.isValid(id) },
  get name() { return req.buf.getName(id) },
  get length() { return req.buf.lineCount(id) },
  get changedtick() { return req.buf.getChangedtick(id) },
  append: async (start, lines) => {
    const replacement = is.array(lines) ? lines as string[] : [lines as string]
    const linesBelow = await req.buf.getLines(id, start + 1, -1, false)
    const newLines = [...replacement, ...linesBelow]

    api.buf.setLines(id, start + 1, start + 1 + newLines.length, false, newLines)
  },
  getAllLines: () => req.buf.getLines(id, 0, -1, true),
  getLines: (start, end) => req.buf.getLines(id, start, end, true),
  getLine: start => req.buf.getLines(id, start, start + 1, true).then(m => m[0]),
  setLines: (start, end, lines) => api.buf.setLines(id, start, end, true, lines),
  delete: start => api.buf.setLines(id, start, start + 1, true, []),
  replace: (start, line) => api.buf.setLines(id, start, start + 1, false, [ line ]),
  getVar: name => req.buf.getVar(id, name),
  setVar: (name, value) => api.buf.setVar(id, name, value),
  getKeymap: mode => req.buf.getKeymap(id, mode),
  delVar: name => api.buf.delVar(id, name),
  getOption: name => req.buf.getOption(id, name),
  setOption: (name, value) => api.buf.setOption(id, name, value),
  setName: name => api.buf.setName(id, name),
  getMark: name => req.buf.getMark(id, name),
  addHighlight: (sourceId, hlGroup, line, colStart, colEnd) => req.buf.addHighlight(id, sourceId, hlGroup, line, colStart, colEnd),
  clearHighlight: (sourceId, lineStart, lineEnd) => api.buf.clearHighlight(id, sourceId, lineStart, lineEnd),
  clearAllHighlights: () => api.buf.clearHighlight(id, -1, 0, -1),
  highlightProblems: async problems => callAtomic([
    [HL_CLR, [id, problems[0].id, 0, -1]],
    ...problems.map(p => [HL_ADD, [id, p.id, p.group, p.line, p.columnStart, p.columnEnd]]),
  ]),
} as Buffer)

const Window = (id: any) => ({
  id,
  get number() { return req.win.getNumber(id) },
  get valid() { return req.win.isValid(id) },
  get tab() { return as.tab(req.win.getTabpage(id)) },
  get buffer() { return as.buf(req.win.getBuf(id)) },
  get cursor() { return req.win.getCursor(id) },
  get position() { return req.win.getPosition(id) },
  get height() { return req.win.getHeight(id) },
  get width() { return req.win.getWidth(id) },
  setCursor: (row, col) => api.win.setCursor(id, [ row, col ]),
  setHeight: height => api.win.setHeight(id, height),
  setWidth: width => api.win.setWidth(id, width),
  getVar: name => req.win.getVar(id, name),
  setVar: (name, val) => api.win.setVar(id, name, val),
  delVar: name => api.win.delVar(id, name),
  getOption: name => req.win.getOption(id, name),
  setOption: (name, val) => api.win.setOption(id, name, val),
} as Window)

const Tabpage = (id: any) => ({
  id,
  get number() { return req.tab.getNumber(id) },
  get valid() { return req.tab.isValid(id) },
  get window() { return as.win(req.tab.getWin(id)) },
  get windows() { return as.winl(req.tab.listWins(id)) },
  getVar: name => req.tab.getVar(id, name),
  setVar: (name, val) => api.tab.setVar(id, name, val),
  delVar: name => api.tab.delVar(id, name),
} as Tabpage)
