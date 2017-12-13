import { Api, ExtContainer, Prefixes, Buffer as IBuffer, Window as IWindow, Tabpage as ITabpage } from '../core/api'
import { ID, is, cc, merge, onFnCall, onProp, Watchers, pascalCase, camelCase, prefixWith } from '../support/utils'
import { sub, processAnyBuffered } from '../messaging/dispatch'
import { Functions } from '../core/vim-functions'
import setupRPC from '../messaging/rpc'

type GenericCallback = (...args: any[]) => void
type DefineFunction = { [index: string]: (fnBody: TemplateStringsArray) => void }
type KeyVal = { [index: string]: any }
type StateChangeEvent = { [index: string]: (value: any) => void }

type AutocmdEvent = (callback: () => void) => void
type AutocmdArgEvent = (argExpression: string, callback: (arg: any) => void) => void

interface Autocmd {
  [index: string]: AutocmdEvent & AutocmdArgEvent,
}

type AtomicCall = [string, any[]]
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
  fg: string,
  bg: string,
}

export interface Buffer {
  id: any,
  length: Promise<number>,
  getLines(start: number, end: number): Promise<string[]>,
  getLine(start: number): Promise<string>,
  setLines(start: number, end: number, replacement: string[]): void,
  delete(start: number): void,
  append(start: number, lines: string | string[]): void,
  replace(start: number, line: string): void,
  getKeymap(mode: string): Promise<any>,
  changedtick: Promise<number>,
  getVar(name: string): Promise<any>,
  setVar(name: string, value: any): void,
  delVar(name: string): void,
  getOption(name: string): Promise<any>,
  setOption(name: string, value: any): void,
  number: Promise<number>,
  name: Promise<string>,
  setName(name: string): void,
  valid: Promise<boolean>,
  getMark(name: string): Promise<number[]>,
  addHighlight(sourceId: number, highlightGroup: string, line: number, columnStart: number, columnEnd: number): Promise<number>,
  clearHighlight(sourceId: number, lineStart: number, lineEnd: number): void,
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

const registeredEventActions = new Set<string>()
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


export const raw = {
  notify: api.core,
  request: req.core,
}

// trying to do dynamic introspection (obj vs arr) messy with typings. (also a bit slower)
export const as = {
  buf: (p: Promise<ExtContainer>): Promise<Buffer> => p.then(e => Buffer(e.id)),
  bufl: (p: Promise<ExtContainer[]>): Promise<Buffer[]> => p.then(m => m.map(e => Buffer(e.id))),
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
export const callAtomic = (calls: AtomicCall[]) => req.core.callAtomic(calls)
export const action = (event: string, cb: GenericCallback): void => {
  actionWatchers.add(event, cb)
  registeredEventActions.add(event)
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
  fg: '#ccc',
  bg: '#222',
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

export const define: DefineFunction = onProp((name: PropertyKey) => (fn: TemplateStringsArray) => {
  const expr = fn[0]
    .split('\n')
    .filter(m => m)
    .join('\\n')
    .replace(/"/g, '\\"')

  onCreate(() => cmd(`exe ":fun! ${pascalCase(name as string)}(...) range\n${expr}\nendfun"`))()
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

export const until: EventWait = onProp((name: PropertyKey) => {
  const ev = camelCase(name as string)
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
  sub('colors.vim.fg', fg => current.fg = fg)
  sub('colors.vim.bg', bg => current.bg = bg)
  processAnyBuffered('colors.vim.fg')
  processAnyBuffered('colors.vim.bg')

  const events = [...registeredEventActions.values()].join('\\n')
  cmd(`let g:vn_cmd_completions .= "${events}\\n"`)
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

define.Commands`
  silent! exe "norm! :''\\\\<c-a>\\\\"\\\\<home>let\\\\ cmds=\\\\"\\\\<cr>"
  return split(cmds, '\\\\s\\\\+')
`

const Buffer = (id: any) => ({
  id,
  get length() { return req.buf.lineCount(id) },
  append: async (start, lines) => {
    const replacement = is.array(lines) ? lines as string[] : [lines as string]
    const linesBelow = await req.buf.getLines(id, start + 1, -1, false)
    const newLines = [...replacement, ...linesBelow]

    api.buf.setLines(id, start + 1, start + 1 + newLines.length, false, newLines)
  },
  getLines: (start, end) => req.buf.getLines(id, start, end, true),
  getLine: start => req.buf.getLines(id, start, start + 1, true).then(m => m[0]),
  setLines: (start, end, lines) => api.buf.setLines(id, start, end, true, lines),
  delete: start => api.buf.setLines(id, start, start + 1, true, []),
  replace: (start, line) => api.buf.setLines(id, start, start + 1, false, [ line ]),
  getVar: name => req.buf.getVar(id, name),
  get changedtick() { return req.buf.getChangedtick(id) },
  setVar: (name, value) => api.buf.setVar(id, name, value),
  getKeymap: mode => req.buf.getKeymap(id, mode),
  delVar: name => api.buf.delVar(id, name),
  getOption: name => req.buf.getOption(id, name),
  setOption: (name, value) => api.buf.setOption(id, name, value),
  get number() { return req.buf.getNumber(id) },
  get name() { return req.buf.getName(id) },
  setName: name => api.buf.setName(id, name),
  get valid() { return req.buf.isValid(id) },
  getMark: name => req.buf.getMark(id, name),
  addHighlight: (sourceId, hlGroup, line, colStart, colEnd) => req.buf.addHighlight(id, sourceId, hlGroup, line, colStart, colEnd),
  clearHighlight: (sourceId, lineStart, lineEnd) => api.buf.clearHighlight(id, sourceId, lineStart, lineEnd),
} as Buffer)

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
