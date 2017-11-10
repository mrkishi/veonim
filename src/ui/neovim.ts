import { Api, ExtContainer, Prefixes, Buffer as IBuffer, Window as IWindow, Tabpage as ITabpage } from '../api'
import { ID, is, cc, merge, onFnCall, onProp, Watchers, pascalCase, camelCase, prefixWith } from '../utils'
import { sub, processAnyBuffered } from '../dispatch'
import { Functions } from '../functions'
import setupRPC from '../rpc'

type GenericCallback = (...args: any[]) => void
type DefineFunction = { [index: string]: (fnBody: TemplateStringsArray) => void }
type KeyVal = { [index: string]: any }
type StateChangeEvent = { [index: string]: (value: any) => void }

type AutocmdEvent = (callback: () => void) => void
type AutocmdArgEvent = (argExpression: string, callback: (arg: any) => void) => void

interface Autocmd {
  [index: string]: AutocmdEvent & AutocmdArgEvent,
}

type EventCallback = (state: NeovimState) => void

interface Event {
  bufLoad(cb: EventCallback): void,
  bufUnload(cb: EventCallback): void,
  bufChange(cb: EventCallback): void,
  bufChangeInsert(cb: EventCallback): void,
  cursorMove(cb: EventCallback): void,
  cursorMoveInsert(cb: (modified: boolean, state: NeovimState) => void): void,
  insertEnter(cb: EventCallback): void,
  insertLeave(cb: EventCallback): void,
  completion(cb: (completedWord: string, state: NeovimState) => void): void,
}

interface EventWait {
  bufLoad: Promise<any>,
  bufUnload: Promise<any>,
  bufChange: Promise<any>,
  bufChangeInsert: Promise<any>,
  cursorMove: Promise<any>,
  cursorMoveInsert: Promise<any>,
  insertEnter: Promise<any>,
  insertLeave: Promise<any>,
  completion: Promise<any>,
}

export interface Position {
  column: number,
  line: number,
}

export interface NeovimState {
  colorscheme: string,
  filetype: string,
  revision: number,
  column: number,
  file: string,
  line: number,
  cwd: string,
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
const events = new Watchers()
const actionWatchers = new Watchers()
const autocmdWatchers = new Watchers()
const stateChangeWatchers = new Watchers()
const io = new Worker(`${__dirname}/../workers/neovim-client.js`)
const { notify, request, on: onEvent, hasEvent, onData } = setupRPC(m => io.postMessage(m))
const notifyEvent = (event: string) => events.notify(event, current)

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

// trying to do dynamic introspection (obj vs arr) messy with typings. (also a bit slower)
export const as = {
  buf: (p: Promise<ExtContainer>) => p.then(e => new VBuffer(e.id)),
  bufl: (p: Promise<ExtContainer[]>) => p.then(m => m.map(e => new VBuffer(e.id))),
  win: (p: Promise<ExtContainer>) => p.then(e => new VWindow(e.id)),
  winl: (p: Promise<ExtContainer[]>) => p.then(m => m.map(e => new VWindow(e.id))),
  tab: (p: Promise<ExtContainer>) => p.then(e => new VTabpage(e.id)),
  tabl: (p: Promise<ExtContainer[]>) => p.then(m => m.map(e => new VTabpage(e.id))),
}

const subscribe = (event: string, fn: (data: any) => void) => {
  if (!hasEvent(event)) onEvent(event, fn)
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

export const list = {
  get buffers() { return as.bufl(req.core.listBufs()) },
  get windows() { return as.winl(req.core.listWins()) },
  get tabs() { return as.tabl(req.core.listTabpages()) },
}

export const current: NeovimState = new Proxy({
  file: '',
  filetype: '',
  cwd: '',
  colorscheme: '',
  revision: -1,
  line: 0,
  column: 0,
}, {
  set: (target, key, value) => {
    const prevValue = Reflect.get(target, key)
    Reflect.set(target, key, value)
    if (prevValue !== value) stateChangeWatchers.notify(key as string, value)
    return true
  }
})

export const getCurrent = {
  get buffer() { return as.buf(req.core.getCurrentBuf()) },
  get window() { return as.win(req.core.getCurrentWin()) },
  get tab() { return as.tab(req.core.getCurrentTabpage()) },
  get position(): Promise<Position> { return new Promise(fin => call.getpos('.').then(m => fin({ line: m[1], column: m[2] }))) },
  get lineContent(): Promise<string> { return req.core.getCurrentLine() },
  get bufferContents(): Promise<string[]> { return call.getline(1, '$') as Promise<string[]> },
}

export const onStateChange: StateChangeEvent = onFnCall((stateKey: string, [cb]) => stateChangeWatchers.add(stateKey, cb))

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

const registerAutocmdWithArgExpression = (event: string, argExpression: string, cb: Function) => {
  const id = uid.next()
  const argExpr = argExpression.replace(/"/g, '\\"')
  const cmdExpr = `au Veonim ${event} * call rpcnotify(0, 'autocmd:${event}:${id}', ${argExpr})`

  onCreate(() => cmd(cmdExpr))()
  onCreate(() => subscribe(`autocmd:${event}:${id}`, (a: any[]) => cb(a[0])))()
}

const autocmd: Autocmd = onFnCall((name: string, args: any[]) => {
  const cb = args.find(a => is.function(a) || is.asyncfunction(a))
  const argExpression = args.find(is.string)
  const ev = pascalCase(name)

  if (argExpression) return registerAutocmdWithArgExpression(ev, argExpression, cb)
  if (!autocmdWatchers.has(ev)) registerAutocmd(ev)
  autocmdWatchers.add(ev, cb)
})

export const until: EventWait = onProp((name: string) => {
  const ev = camelCase(name)
  return new Promise(fin => {
    const whenDone = () => (fin(), events.remove(ev, whenDone))
    events.add(ev, whenDone)
  })
})

export const on: Event = onFnCall((name, [cb]) => events.add(name, cb))

const refreshState = (event = 'bufLoad') => async () => {
  const [ filetype, cwd, file, colorscheme, revision, { line, column } ] = await cc(
    expr(`&filetype`),
    call.getcwd(),
    call.expand(`%f`),
    g.colors_name,
    expr(`b:changedtick`),
    getCurrent.position,
  )

  merge(current, { filetype, cwd, file, colorscheme, revision, line, column })
  notifyEvent(event)
}

const processBufferedActions = async () => {
  const bufferedActions = await g.vn_rpc_buf
  if (!bufferedActions.length) return
  bufferedActions.forEach(([event, ...args]) => actionWatchers.notify(event, ...args))
  g.vn_rpc_buf = []
}

onCreate(() => {
  cmd(`aug Veonim | au! | aug END`)
  subscribe('veonim', ([ event, args = [] ]) => actionWatchers.notify(event, ...args))
  processBufferedActions()
  refreshState()
})

autocmd.bufAdd(refreshState())
autocmd.bufEnter(refreshState())
autocmd.bufDelete(refreshState('bufUnload'))
autocmd.dirChanged(`v:event.cwd`, m => current.cwd = m)
autocmd.fileType(`expand('<amatch>')`, m => current.filetype = m)
autocmd.colorScheme(`expand('<amatch>')`, m => current.colorscheme = m)
autocmd.insertEnter(() => notifyEvent('insertEnter'))
autocmd.insertLeave(() => notifyEvent('insertLeave'))

autocmd.cursorMoved(async () => {
  const { line, column } = await getCurrent.position
  merge(current, { line, column })
  notifyEvent('cursorMove')
})

autocmd.completeDone(async () => {
  const { word } = await expr(`v:completed_item`)
  events.notify('completion', word, current)
})

autocmd.textChanged(async () => {
  current.revision = await expr(`b:changedtick`)
  notifyEvent('bufChange')
})

autocmd.cursorMovedI(async () => {
  const prevRevision = current.revision
  const [ revision, { line, column } ] = await cc(expr(`b:changedtick`), getCurrent.position)
  merge(current, { revision, line, column })

  if (prevRevision !== current.revision) notifyEvent('bufChangeInsert')
  events.notify('cursorMoveInsert', prevRevision !== current.revision, current)
})

sub('session:switch', refreshState)

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
