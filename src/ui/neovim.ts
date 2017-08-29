import { Api, ExtContainer, Prefixes, Buffer as IBuffer, Window as IWindow, Tabpage as ITabpage } from '../api'
import { onFnCall, onProp, Watchers, pascalCase, prefixWith } from '../utils'
import { Functions } from '../functions'
import { sub, processAnyBuffered } from '../dispatch'
import setupRPC from '../rpc'

type GenericCallback = (...args: any[]) => void
type StrFnObj = { [index: string]: (callback: () => void) => void }
type DefineFunction = { [index: string]: (fnBody: TemplateStringsArray) => void }
type KeyVal = { [index: string]: any }

const prefix = {
  core: prefixWith(Prefixes.Core),
  buffer: prefixWith(Prefixes.Buffer),
  window: prefixWith(Prefixes.Window),
  tabpage: prefixWith(Prefixes.Tabpage),
}
const onReady = new Set<Function>()
const notifyCreated = () => onReady.forEach(cb => cb())
export const onCreate = (fn: Function) => (onReady.add(fn), fn)

const actionWatchers = new Watchers()
const io = new Worker(`${__dirname}/../workers/neovim-client.js`)
const { notify, request, on, hasEvent, onData } = setupRPC(m => io.postMessage(m))

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

export const cwdir = (): Promise<string> => req.core.callFunction('getcwd', [])
export const input = (keys: string) => api.core.input(keys)
export const cmd = (command: string) => api.core.command(command)
export const ex = (command: string) => req.core.commandOutput(command)
export const expr = (expression: string) => req.core.eval(expression)
export const call: Functions = onFnCall((name, args) => req.core.callFunction(name, args))
export const getCurrentLine = () => req.core.getCurrentLine()
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

export const current = {
  get buffer() { return as.buf(req.core.getCurrentBuf()) },
  get window() { return as.win(req.core.getCurrentWin()) },
  get tab() { return as.tab(req.core.getCurrentTabpage()) },
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

export const autocmd: StrFnObj = onFnCall((name, args) => {
  const ev = pascalCase(name)
  onCreate(() => cmd(`au Veonim ${ev} * call rpcnotify(0, 'autocmd:${ev}')`))()
  onCreate(() => subscribe(`autocmd:${ev}`, args[0]))()
})

onCreate(() => subscribe('veonim', ([ event, args = [] ]) => actionWatchers.notify(event, ...args)))
onCreate(() => cmd(`aug Veonim | au! | aug END`))

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
