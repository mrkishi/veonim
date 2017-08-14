import { Api, Prefixes, ExtType, Buffer as IBuffer, Window as IWindow, Tabpage as ITabpage } from '../api'
import { is, onFnCall, onProp, Watchers, pascalCase, prefixWith } from '../utils'
import { Functions } from '../functions'
import { sub } from '../dispatch'
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

const mapIntoExt = (m: any) => {
  if (m.kind === ExtType.Buffer) return new VBuffer(m.val)
  if (m.kind === ExtType.Window) return new VWindow(m.val)
  if (m.kind === ExtType.Tabpage) return new VTabpage(m.val)
  return m
}

const xformExt = (data: any) => {
  if (!data) return data
  if (is.object(data) && data.extContainer) return mapIntoExt(data)
  if (is.array(data) && data.every((m: any) => m.extContainer)) return data.map(mapIntoExt)
  return data
}

const actionWatchers = new Watchers()
const io = new Worker(`${__dirname}/../workers/neovim-client.js`)
const { notify, request, on, hasEvent, onData } = setupRPC(m => io.postMessage(m))

io.onmessage = ({ data: [kind, [d1, d2, d3]] }: MessageEvent) => onData(kind, [d1, d2, xformExt(d3)])

sub('session:create', m => io.postMessage([65, m]))
sub('session:switch', m => io.postMessage([66, m]))
sub('session:create', () => notifyCreated())

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

const subscribe = (event: string, fn: (data: any) => void) => {
  if (!hasEvent(event)) on(event, fn)
  api.core.subscribe(event)
}

export const action = (event: string, cb: GenericCallback): void => actionWatchers.add(event, cb)
export const input = (keys: string) => api.core.input(keys)
export const cmd = (command: string) => api.core.command(command)
export const ex = (command: string) => req.core.commandOutput(command)
export const expr = (expression: string) => req.core.eval(expression)
export const call: Functions = onFnCall((name, args) => req.core.callFunction(name, args))
export const getCurrentLine = () => req.core.getCurrentLine()

// TODO: test vars and see if we need below logic from old neovim-client
//a.getVar = async key => {
  //const val = await req.getVar(key as string).catch(e => e)
  //if (!Array.isArray(val) && val[1] !== 'Key not found') return val
//}
export const g = new Proxy({} as KeyVal, {
  get: (_t, name: string) => req.core.getVar(name),
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

interface VimBuffer {
  id: any,
  length: Promise<number>,
  name: string | Promise<string>,
  getLines(start: number, end: number, strict_indexing: boolean): Promise<string[]>,
  setLines(start: number, end: number, strict_indexing: boolean, replacement: string[]): void,
  getVar(name: string): Promise<any>,
  getChangedtick(): Promise<number>,
  setVar(name: string, value: any): void,
  delVar(name: string): void,
  getOption(name: string): Promise<any>,
  setOption(name: string, value: any): void,
  getNumber(): Promise<number>,
  isValid(): Promise<boolean>,
  getMark(name: string): Promise<number[]>,
  addHighlight(src_id: number, hl_group: string, line: number, col_start: number, col_end: number): Promise<number>,
  clearHighlight(src_id: number, line_start: number, line_end: number): void,
}

// yeah wtf i hate classes and typescript wtf wtf
const VBuffer = class VBuffer implements VimBuffer {
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

  getChangedtick() {
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

  getNumber() {
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

const VWindow = class VWindow {
  public id: any
  constructor (id: any) { this.id = id }

  getBuf() {
    return req.win.getBuf(this.id)
  }

  getCursor() {
    return req.win.getCursor(this.id)
  }

  setCursor(pos: number[]) {
    api.win.setCursor(this.id, pos)
  }

  getHeight() {
    return req.win.getHeight(this.id)
  }

  setHeight(height: number) {
    api.win.setHeight(this.id, height)
  }

  getWidth() {
    return req.win.getWidth(this.id)
  }

  setWidth(width: number) {
    api.win.setWidth(this.id, width)
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

  getPosition() {
    return req.win.getPosition(this.id)
  }

  getTabpage() {
    return req.win.getTabpage(this.id)
  }

  getNumber() {
    return req.win.getNumber(this.id)
  }

  isValid() {
    return req.win.isValid(this.id)
  }
}

const VTabpage = class VTabpage {
  public id: any
  constructor (id: any) { this.id = id }

  listWins() {
    return req.tab.listWins(this.id)
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

  getWin() {
    return req.tab.getWin(this.id)
  }

  getNumber() {
    return req.tab.getNumber(this.id)
  }

  isValid() {
    return req.tab.isValid(this.id)
  }
}

export const listBuffers = () => {
  const res: any = req.core.listBufs()
  return res as Promise<VimBuffer[]>
}
