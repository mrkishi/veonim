import { req, api, onRedraw, onConfig, onExit, subscribe, attachToVim, switchToVim, newVim, resize, NewVimResponse } from './master-control'
import { Watchers, onFnCall, onProp, pascalCase } from './utils'
import { ConfigCallback } from './config-reader'
import { Functions } from './functions'

type StrFnObj = { [index: string]: (callback: () => void) => void }
type GenericCallback = (...args: any[]) => void
type DefineFunction = { [index: string]: (fnBody: TemplateStringsArray) => void }

export interface NeovimEvents {
  config(fn: ConfigCallback): void,
  redraw(fn: (instructions: any[]) => void): void,
  exit(fn: (id: number, code: number) => void): void
}

export interface VimOptions {
  askCd: boolean
}

export interface Neovim {
  resize(width: number, height: number): void,
  input(keys: string): void,
  cmd(command: string): void,
  ex(command: string): Promise<string>,
  expr(expression: string): Promise<any>,
  action(event: string, cb: GenericCallback): void,
  getColor(id: number): Promise<{ fg: number, bg: number }>,
  subscribe(event: string, cb: GenericCallback): void,
  call(name: string, args: any[]): any,
  switchTo(id: number): void,
  create(opts?: VimOptions): Promise<NewVimResponse>,
  attach(id: number): void,
  getVar(key: string): Promise<any>,
  setVar(key: string, val: any): void,
  getOption(name: string): Promise<any>,
  setOption(key: string, value: any): void,
  getCurrentLine(): Promise<string>,
  on: NeovimEvents
}

const watchers = new Watchers()
const a: Neovim = {} as Neovim

a.resize = (w, h) => resize(w, h)
a.input = m => api.input(m)
// TODO: allow fancy template string def when move to ui level
a.cmd = m => api.command(m)
a.ex = m => req.commandOutput(m)
a.expr = m => req.eval(m)
a.action = (e, cb) => watchers.add(e, cb)
a.subscribe = (e, cb) => subscribe(e, cb)
a.call = (name, args) => req.callFunction(name, args)
a.switchTo = id => switchToVim(id)
a.create = (opts?: VimOptions) => newVim(opts)
a.attach = id => attachToVim(id)
a.setVar = (key, val) => api.setVar(key, val)
a.getOption = key => req.getOption(key)
a.setOption = (key, val) => api.setOption(key, val)
a.getCurrentLine = () => req.getCurrentLine()

a.getVar = async key => {
  const val = await req.getVar(key as string).catch(e => e)
  if (!Array.isArray(val) && val[1] !== 'Key not found') return val
}


a.on = {
  config: fn => onConfig(fn),
  redraw: fn => onRedraw(fn),
  exit: fn => onExit(fn)
}

subscribe('veonim', ([ event, args = [] ]) => watchers.notify(event, ...args))

// TODO: lol
export { resize, subscribe }
export const input = a.input
export const cmd = a.cmd
export const ex = a.ex
export const expr = a.expr
export const action = a.action
//export const call = a.call
export const call: Functions = onFnCall((name, args) => a.call(name, args))
export const switchTo = a.switchTo
export const create = a.create
export const attach = a.attach
export const setVar = a.setVar
export const getOption = a.getOption
export const setOption = a.setOption
export const getCurrentLine = a.getCurrentLine
export const on = a.on
export const getColor = a.getColor

export const define: DefineFunction = onProp((name: string) => (fn: TemplateStringsArray) => {
  const expr = fn[0]
    .split('\n')
    .filter(m => m)
    .join('\\n')
    .replace(/"/g, '\\"')

  a.cmd(`exe ":fun! ${pascalCase(name)}(...) range\n${expr}\nendfun"`)
})

export const autocmd: StrFnObj = onFnCall((name, args) => {
  const ev = pascalCase(name)
  // TODO: make autocmds on internal event namespace i.e. veonim:internal
  a.cmd(`au Veonim ${ev} * call rpcnotify(0, 'veonim', 'autocmd:${ev}')`)
  // TODO: move this to lower level. don't use actions namespace
  watchers.add(`autocmd:${ev}`, args[0])
  //action(`autocmd:${ev}`, args[0])
})
