const DEVMODE = process.env.VEONIM_DEV
import { createWriteStream } from 'fs'

export const noop = () => undefined
export const merge = Object.assign

const logfile = createWriteStream('logs')
const writemsg = (m: string) => logfile.write(`${JSON.stringify(m)}\n`)

const logger = (str: TemplateStringsArray | string, v: any[]) => typeof str === 'string'
  ? writemsg(str as string)
  : writemsg((str as TemplateStringsArray).map((s, ix) => s + (v[ix] || '')).join(''))

export const log = (str: TemplateStringsArray | string, ...vars: any[]) => logger(str, vars)
export const dev = (str: TemplateStringsArray | string, ...vars: any[]) => DEVMODE && logger(str, vars)

process.on('unhandledRejection', writemsg)

type TypeChecker = (thing: any) => boolean
interface Types {
  string: TypeChecker,
  number: TypeChecker,
  array: TypeChecker,
  object: TypeChecker,
  null: TypeChecker,
  asyncfunction: TypeChecker,
  function: TypeChecker,
  promise: TypeChecker,
  map: TypeChecker,
  set: TypeChecker
}

export const $ = (...fns: Function[]) => (...a: any[]) => fns.reduce((res, fn, ix) => ix ? fn(res) : fn(...res), a)

export const type = (m: any) => {
  const [ , type ] = Object.prototype.toString.call(m).match(/^\[object (\w+)\]/g)
  return (type || 'undefined').toLowerCase()
}

export const ID = (val = 0) => ({ next: () => (val++, val) })

export const is = new Proxy<Types>({} as Types, { get: (_, key) => (val: any) => type(val) === key })

export const onProp = <T>(cb: (name: PropertyKey) => void): T => new Proxy({}, { get: (_, name) => cb(name) }) as T
export const onFnCall = <T>(cb: (name: string, args: any[]) => void): T => new Proxy({}, { get: (_, name) => (...args: any[]) => cb(name as string, args) }) as T

export const pascalCase = (m: string) => m[0].toUpperCase() + m.slice(1)
export const snakeCase = (m: string) => m.split('').map(ch => /[A-Z]/.test(ch) ? '_' + ch.toLowerCase(): ch).join('')

export const promisifyApi = <T>(o: object): T => onFnCall<T>((name: string) => (...args: any[]) => new Promise((ok, no) => {
  const theFunctionToCall: Function = Reflect.get(o, name)
  theFunctionToCall(...args, (err: Error, res: any) => err ? no(err) : ok(res))
}))

export const mergeValid = (target: any, source: any) => Object.keys(source).reduce((tar, key) => {
  const val = Reflect.get(source, key)
  if (val !== null && val !== undefined && val !== '') Reflect.set(tar, key, val)
  return tar
}, target)

export function debounce (fn: Function, wait = 1) {
  let timeout: NodeJS.Timer
  return function(this: any, ...args: any[]) {
    const ctx = this
    clearTimeout(timeout)
    timeout = setTimeout(() => fn.apply(ctx, args), wait)
  }
}

export class Watchers extends Map<string, Set<Function>> {
  constructor() {
    super()
  }

  add(event: string, handler: (data: any) => void) {
    this.has(event) ? this.get(event)!.add(handler) : this.set(event, new Set<Function>([ handler ]))
  }

  notify(event: string, ...args: any[]) {
    this.has(event) && this.get(event)!.forEach(cb => cb(...args))
  }

  notifyFn(event: string, fn: (handler: Function) => void) {
    this.has(event) && this.get(event)!.forEach(cb => fn(cb))
  }

  remove(event: string, handler: Function) {
    this.has(event) && this.get(event)!.delete(handler)
  }
}
