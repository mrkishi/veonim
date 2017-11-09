import { Api, ExtContainer, Prefixes, Buffer as IBuffer, Window as IWindow, Tabpage as ITabpage } from '../api'
import { ID, is, debounce, onFnCall, onProp, Watchers, pascalCase, prefixWith } from '../utils'
import { sub, processAnyBuffered } from '../dispatch'
import { Functions } from '../functions'
import setupRPC from '../rpc'

export interface Position {
  line: number,
  column: number,
}

type GenericCallback = (...args: any[]) => void
type ProxyToPromise = { [index: string]: () => Promise<any> }
type DefineFunction = { [index: string]: (fnBody: TemplateStringsArray) => void }
type KeyVal = { [index: string]: any }

type AutocmdEvent = (callback: () => void) => void
type AutocmdArgEvent = (argExpression: string, callback: (arg: any) => void) => void

interface Autocmd {
  [index: string]: AutocmdEvent & AutocmdArgEvent,
}

const prefix = {
  core: prefixWith(Prefixes.Core),
  buffer: prefixWith(Prefixes.Buffer),
  window: prefixWith(Prefixes.Window),
  tabpage: prefixWith(Prefixes.Tabpage),
}
const onReady = new Set<Function>()
const notifyCreated = () => onReady.forEach(cb => cb())
export const onCreate = (fn: Function) => (onReady.add(fn), fn)

const uid = ID()
const actionWatchers = new Watchers()
const autocmdWatchers = new Watchers()
const stateChangeWatchers = new Watchers()
const io = new Worker(`${__dirname}/../workers/neovim-client.js`)
const { notify, request, on, hasEvent, onData } = setupRPC(m => io.postMessage(m))
const state = { file: '', filetype: '', cwd: '', colorscheme: '' }

io.onmessage = ({ data: [kind, data] }: MessageEvent) => onData(kind, data)

sub('session:create', m => io.postMessage([65, m]))
sub('session:switch', m => io.postMessage([66, m]))
sub('session:create', () => notifyCreated())

setImmediate(() => {
  processAnyBuffered('session:create')
  processAnyBuffered('session:switch')
})

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

// trying to do dyanmic introspection (obj vs arr) messy with typings. (also a bit slower)
export const as = {
  buf: (p: Promise<ExtContainer>) => p.then(e => new VBuffer(e.id)),
  bufl: (p: Promise<ExtContainer[]>) => p.then(m => m.map(e => new VBuffer(e.id))),
  win: (p: Promise<ExtContainer>) => p.then(e => new VWindow(e.id)),
  winl: (p: Promise<ExtContainer[]>) => p.then(m => m.map(e => new VWindow(e.id))),
  tab: (p: Promise<ExtContainer>) => p.then(e => new VTabpage(e.id)),
  tabl: (p: Promise<ExtContainer[]>) => p.then(m => m.map(e => new VTabpage(e.id))),
}

const subscribe = (event: string, fn: (data: any) => void) => {
  if (!hasEvent(event)) on(event, fn)
  api.core.subscribe(event)
}

export const input = (keys: string) => api.core.input(keys)
export const cmd = (command: string) => api.core.command(command)
export const ex = (command: string) => req.core.commandOutput(command)
export const expr = (expression: string) => req.core.eval(expression)
export const call: Functions = onFnCall((name, args) => req.core.callFunction(name, args))
export const feedkeys = (keys: string, mode = 'm', escapeCSI = false) => req.core.feedkeys(keys, mode, escapeCSI)
export const normal = (keys: string) => cmd(`norm! "${keys.replace(/"/g, '\\"')}"`)
export const action = (event: string, cb: GenericCallback): void => {
  actionWatchers.add(event, cb)
  cmd(`let g:vn_cmd_completions .= "${event}\\n"`)
}
export const cwdir = (): Promise<string> => call.getcwd()

export const list = {
  get buffers() { return as.bufl(req.core.listBufs()) },
  get windows() { return as.winl(req.core.listWins()) },
  get tabs() { return as.tabl(req.core.listTabpages()) },
}

export const current = {
  get buffer() { return as.buf(req.core.getCurrentBuf()) },
  get window() { return as.win(req.core.getCurrentWin()) },
  get tab() { return as.tab(req.core.getCurrentTabpage()) },
  get position(): Promise<Position> { return new Promise(fin => call.getpos('.').then(m => fin({ line: m[1], column: m[2] }))) },
  get lineContent(): Promise<string> { return req.core.getCurrentLine() },
  get file(): Promise<string> { return call.expand(`%f`) },
  get revision(): Promise<number> { return expr(`b:changedtick`) },
  get bufferContents(): Promise<string[]> { return call.getline(1, '$') as Promise<string[]> },
  get colorscheme(): string { return state.colorscheme },
  get filetype(): string { return state.filetype },
  get cwd(): string { return state.cwd },
}

export const g = new Proxy({} as KeyVal, {
  get: async (_t, name: string) => {
    const val = await req.core.getVar(name as string).catch(e => e)
    return Array.isArray(val) && val[1] === 'Key not found' ? undefined : val
  },
  set: (_t, name: string, val: any) => (api.core.setVar(name, val), true),
})

export const define: DefineFunction = onProp((name: string) => (fn: TemplateStringsArray) => {
  const expr = fn[0]
    .split('\n')
    .filter(m => m)
    .join('\\n')
    .replace(/"/g, '\\"')

  onCreate(() => cmd(`exe ":fun! ${pascalCase(name)}(...) range\n${expr}\nendfun"`))()
})

const registerAutocmd = (event: string) => {
  const cmdExpr = `au Veonim ${event} * call rpcnotify(0, 'autocmd:${event}')`

  onCreate(() => cmd(cmdExpr))()
  onCreate(() => subscribe(`autocmd:${event}`, () => autocmdWatchers.notify(event)))()
}

const registerAutocmdEventWithArgExpression = (event: string, argExpression: string, cb: Function) => {
  const id = uid.next()
  const argExpr = argExpression.replace(/"/g, '\\"')
  const cmdExpr = `au Veonim ${event} * call rpcnotify(0, 'autocmd:${event}:${id}', ${argExpr})`

  onCreate(() => cmd(cmdExpr))()
  onCreate(() => subscribe(`autocmd:${event}:${id}`, (a: any[]) => cb(a[0])))()
}

export const autocmd: Autocmd = onFnCall((name, args) => {
  const cb = args.find(a => is.function(a) || is.asyncfunction(a))
  const argExpression = args.find(is.string)
  const ev = pascalCase(name)

  if (argExpression) return registerAutocmdEventWithArgExpression(ev, argExpression, cb)
  if (!autocmdWatchers.has(ev)) registerAutocmd(ev)
  autocmdWatchers.add(ev, cb)
})

export const until: ProxyToPromise = onFnCall(name => {
  const ev = pascalCase(name)
  if (!autocmdWatchers.has(ev)) registerAutocmd(ev)
  return new Promise(fin => {
    const whenDone = () => (fin(), autocmdWatchers.remove(ev, whenDone))
    autocmdWatchers.add(ev, whenDone)
  })
})

// TODO; use the generic autocmd argEpxr registrations
export const onFile = {
  load: (cb: (file: string) => void) => {
    onCreate(() => cmd(`au Veonim BufAdd * call rpcnotify(0, 'file:load', expand('<afile>:p'))`))()
    onCreate(() => subscribe(`file:load`, ((a: any[]) => cb(a[0]))))()
  },
  unload: (cb: (file: string) => void) => {
    onCreate(() => cmd(`au Veonim BufDelete * call rpcnotify(0, 'file:unload', expand('<afile>:p'))`))()
    onCreate(() => subscribe(`file:unload`, ((a: any[]) => cb(a[0]))))()
  }
}

define.VeonimComplete`
  return a:1 ? g:veonim_complete_pos : g:veonim_completions
`

define.CompleteScroll`
  if len(g:veonim_completions)
    if g:veonim_completing
      return a:1 ? "\\<c-n>" : "\\<c-p>"
    endif

    let g:veonim_completing = 1
    return a:1 ? "\\<c-x>\\<c-u>" : "\\<c-x>\\<c-u>\\<c-p>\\<c-p>"
  endif

  return a:1 ? "\\<tab>" : "\\<c-w>"
`

define.Buffers`
  let current = bufnr('%')
  let bufs = filter(range(0, bufnr('$')), 'buflisted(v:val)')
  return map(bufs, {key, val -> { 'name': bufname(val), 'cur': val == current, 'mod': getbufvar(val, '&mod') }})
`

define.Commands`
  silent! exe "norm! :''\\\\<c-a>\\\\"\\\\<home>let\\\\ cmds=\\\\"\\\\<cr>"
  return split(cmds, '\\\\s\\\\+')
`

define.ModifiedBuffers`
  let current = bufnr('%')
  let bufs = filter(range(0, bufnr('$')), 'buflisted(v:val)')
  return map(filter(map(bufs, {key, val -> { 'path': expand('#'.val.':p'), 'mod': getbufvar(val, '&mod') }}), {key, val -> val.mod == 1}), {key, val -> val.path})
`

define.PatchCurrentBuffer`
  let pos = getcurpos()
  let patch = a:1
  for chg in patch
    if chg.op == 'delete'
      exec chg.line . 'd'
    elseif chg.op == 'replace'
      call setline(chg.line, chg.val)
    elseif chg.op == 'append'
      call append(chg.line, chg.val)
    end
  endfor
  call cursor(pos[1:])
`

onCreate(async () => {
  const bufferedActions = await g.vn_rpc_buf
  if (!bufferedActions.length) return
  bufferedActions.forEach(([event, ...args]) => actionWatchers.notify(event, ...args))
  g.vn_rpc_buf = []
})

// TODO: really some of these should be in autocomplete file
onCreate(() => {
  g.veonim_completing = 0
  g.veonim_complete_pos = 1
  g.veonim_completions = []

  cmd(`aug Veonim | au! | aug END`)
  cmd(`set completefunc=VeonimComplete`)
  cmd(`ino <expr> <tab> CompleteScroll(1)`)
  cmd(`ino <expr> <s-tab> CompleteScroll(0)`)

  subscribe('veonim', ([ event, args = [] ]) => actionWatchers.notify(event, ...args))

  expr(`&filetype`).then(updateFileType)
  call.getcwd().then(updateCurrentDir)
  g.colors_name.then(updateColor)
  call.expand(`%f`).then(updateFile)
})

const updateColor = (color: string) => {
  if (state.colorscheme === color) return
  state.colorscheme = color
  stateChangeWatchers.notify('colorscheme', color)
}

const updateFileType = (filetype: string) => {
  if (state.filetype === filetype) return
  state.filetype = filetype
  stateChangeWatchers.notify('filetype', filetype)
}

const updateFile = (file: string) => {
  if (state.file === file) return
  state.file = file
  stateChangeWatchers.notify('file', file)
}

const updateCurrentDir = (dir: string) => {
  if (state.cwd === dir) return
  state.cwd = dir
  stateChangeWatchers.notify('dir', dir)
}

autocmd.dirChanged(`v:event.cwd`, updateCurrentDir)
autocmd.fileType(`expand('<amatch>')`, updateFileType)
autocmd.colorScheme(`expand('<amatch>')`, updateColor)
autocmd.bufEnter(debounce(() => {
  g.colors_name.then(updateColor)
  call.expand(`%f`).then(updateFile)
}, 50))

sub('session:switch', () => {
  expr(`&filetype`).then(updateFileType)
  call.getcwd().then(updateCurrentDir)
  g.colors_name.then(updateColor)
  call.expand(`%f`).then(updateFile)
})

export const onStateChange = {
  colorscheme: (cb: (color: string) => void): void => stateChangeWatchers.add('colorscheme', cb),
  filetype: (cb: (filetype: string) => void): void => stateChangeWatchers.add('filetype', cb),
  cwd: (cb: (cwd: string) => void): void => stateChangeWatchers.add('cwd', cb),
  file: (cb: (file: string) => void): void => stateChangeWatchers.add('file', cb),
}

export const VBuffer = class VBuffer {
  public id: any
  constructor (id: any) { this.id = id }

  get length() {
    return req.buf.lineCount(this.id)
  }

  getLines(start: number, end: number, strict_indexing: boolean) {
    return req.buf.getLines(this.id, start, end, strict_indexing)
  }

  setLines(start: number, end: number, strict_indexing: boolean, replacement: string[]) {
    api.buf.setLines(this.id, start, end, strict_indexing, replacement)
  }

  getVar(name: string) {
    return req.buf.getVar(this.id, name)
  }

  get changedtick() {
    return req.buf.getChangedtick(this.id)
  }

  setVar(name: string, value: any) {
    api.buf.setVar(this.id, name, value)
  }

  delVar(name: string) {
    api.buf.delVar(this.id, name)
  }

  getOption(name: string) {
    return req.buf.getOption(this.id, name)
  }

  setOption(name: string, value: any) {
    api.buf.setOption(this.id, name, value)
  }

  get number() {
    return req.buf.getNumber(this.id)
  }

  get name(): string | Promise<string> {
    return req.buf.getName(this.id)
  }

  set name(value: string | Promise<string>) {
    api.buf.setName(this.id, value as string)
  }

  isValid() {
    return req.buf.isValid(this.id)
  }

  getMark(name: string) {
    return req.buf.getMark(this.id, name)
  }

  addHighlight(src_id: number, hl_group: string, line: number, col_start: number, col_end: number) {
    return req.buf.addHighlight(this.id, src_id, hl_group, line, col_start, col_end)
  }

  clearHighlight(src_id: number, line_start: number, line_end: number) {
    api.buf.clearHighlight(this.id, src_id, line_start, line_end)
  }
}

export const VWindow = class VWindow {
  public id: any
  constructor (id: any) { this.id = id }

  get buffer() {
    return req.win.getBuf(this.id)
  }

  get cursor(): number[] | Promise<number[]> {
    return req.win.getCursor(this.id)
  }

  set cursor(pos: number[] | Promise<number[]>) {
    api.win.setCursor(this.id, pos as number[])
  }

  get height(): number | Promise<number> {
    return req.win.getHeight(this.id)
  }

  set height(height: number | Promise<number>) {
    api.win.setHeight(this.id, height as number)
  }

  get width(): number | Promise<number> {
    return req.win.getWidth(this.id)
  }

  set width(width: number | Promise<number>) {
    api.win.setWidth(this.id, width as number)
  }

  getVar(name: string) {
    return req.win.getVar(this.id, name)
  }

  setVar(name: string, value: any) {
    api.win.setVar(this.id, name, value)
  }

  delVar(name: string) {
    api.win.delVar(this.id, name)
  }

  getOption(name: string) {
    return req.win.getOption(this.id, name)
  }

  setOption(name: string, value: any) {
    api.win.setOption(this.id, name, value)
  }

  get position() {
    return req.win.getPosition(this.id)
  }

  get tab() {
    return as.tab(req.win.getTabpage(this.id))
  }

  get number() {
    return req.win.getNumber(this.id)
  }

  isValid() {
    return req.win.isValid(this.id)
  }
}

export const VTabpage = class VTabpage {
  public id: any
  constructor (id: any) { this.id = id }

  get windows() {
    return as.winl(req.tab.listWins(this.id))
  }

  getVar(name: string) {
    return req.tab.getVar(this.id, name)
  }

  setVar(name: string, value: any) {
    api.tab.setVar(this.id, name, value)
  }

  delVar(name: string) {
    api.tab.delVar(this.id, name)
  }

  get win() {
    return as.win(req.tab.getWin(this.id))
  }

  get number() {
    return req.tab.getNumber(this.id)
  }

  isValid() {
    return req.tab.isValid(this.id)
  }
}
