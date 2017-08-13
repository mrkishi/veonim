import { Prefixes, Buffer as IBuffer, Window as IWindow, Tabpage as ITabpage } from '../api'
import { onFnCall, onProp, Watchers, pascalCase, prefixWith } from '../utils'
import { Functions } from '../functions'
import { Session } from  './sessions'
import { sub } from '../dispatch'
import setupRPC from '../rpc'
import { Api } from '../api'

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

io.onmessage = ({ data }: MessageEvent) => onData(data[0], data[1])
sub(Session.create, m => io.postMessage([65, m]))
sub(Session.switch, m => io.postMessage([66, m]))
sub(Session.create, () => notifyCreated())

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

export const listBuffers = () => req.core.listBufs()
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

export class Buffer implements IBuffer {
  public id: any
  constructor (id: any) { this.id = id }

  lineCount(buffer = this.id) {
    console.log('buffer', this.prefix)
    return Promise.resolve(1)
  }
}

export class Window implements IWindow {
  public id: any
  constructor (id: any) { this.id = id }
}

export class Tabpage {
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

onCreate(() => subscribe('veonim', ([ event, args = [] ]) => actionWatchers.notify(event, ...args)))
onCreate(() => cmd(`aug Veonim | au! | aug END`))
