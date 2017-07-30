import { createWriteStream } from 'fs'
import * as through from 'through'
import { StringDecoder } from 'string_decoder'

export interface ActionCaller { [index: string]: (data?: any) => void }
export interface Actions<T> { [index: string]: (state: T, actions: ActionCaller, data: any) => any }
export interface Events<T> { [index: string]: (state: T, actions: ActionCaller, data: any) => any }
export const BindEventsToActions = <T>(obj: T & object) => new Proxy(obj, { get: (tar, method) => Reflect.get(tar, method) })

const logfile = createWriteStream('logs')
const writemsg = (m: string) => logfile.write(`${JSON.stringify(m)}\n`)

const logger = (str: TemplateStringsArray | string, v: any[]) => typeof str === 'string'
  ? writemsg(str as string)
  : writemsg((str as TemplateStringsArray).map((s, ix) => s + (v[ix] || '')).join(''))

export const log = (str: TemplateStringsArray | string, ...vars: any[]) => logger(str, vars)
export const dev = (str: TemplateStringsArray | string, ...vars: any[]) => {
  if (process.env.VEONIM_DEV) logger(str, vars)
}

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

export const merge = Object.assign
export const cc = (...a: any[]) => Promise.all(a)
export const delay = (t: number) => new Promise(d => setTimeout(d, t))
export const ID = (val = 0) => ({ next: () => (val++, val) })
export const $ = (...fns: Function[]) => (...a: any[]) => fns.reduce((res, fn, ix) => ix ? fn(res) : fn(...res), a)
export const type = (m :any) => (Object.prototype.toString.call(m).match(/^\[object (\w+)\]/) || [])[1].toLowerCase()
export const is = new Proxy<Types>({} as Types, { get: (_, key) => (val: any) => type(val) === key })
export const onProp = <T>(cb: (name: PropertyKey) => void): T => new Proxy({}, { get: (_, name) => cb(name) }) as T
export const onFnCall = <T>(cb: (name: string, args: any[]) => void): T => new Proxy({}, { get: (_, name) => (...args: any[]) => cb(name as string, args) }) as T
export const pascalCase = (m: string) => m[0].toUpperCase() + m.slice(1)
export const snakeCase = (m: string) => m.split('').map(ch => /[A-Z]/.test(ch) ? '_' + ch.toLowerCase(): ch).join('')
export const mergeValid = (target: any, source: any) => Object.entries(source).reduce((tar, [k, v]) => (v && Reflect.set(tar, k, v), tar), target)

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

export function NewlineSplitter () {
  const decoder = new StringDecoder()
  const matcher = /\r?\n/
  let soFar = ''

  function emit (stream: any, piece: any) {
    stream.queue(piece)
  }

  function next (stream: any, buffer: any) {
    const pieces = ((soFar != null ? soFar : '') + buffer).split(matcher)
    soFar = pieces.pop() || ''

    let totalPieces = pieces.length
    for (var i = 0; i < totalPieces; i++) {
      emit(stream, pieces[i])
    }
  }

  return through(
    function (this: any, b: any) {
      next(this, decoder.write(b))
    },
    function (this: any) {
      if (decoder.end) next(this, decoder.end())
      if (soFar != null) emit(this, soFar)
      this.queue(null)
    }
  )
}