import { StringDecoder } from 'string_decoder'
import { join, extname } from 'path'
import * as through from 'through'
import * as fs from 'fs'

const logger = (str: TemplateStringsArray | string, v: any[]) => Array.isArray(str)
  ? console.log((str as TemplateStringsArray).map((s, ix) => s + (v[ix] || '')).join(''))
  : console.log(str as string)

export const log = (str: TemplateStringsArray | string, ...vars: any[]) => logger(str, vars)

process.on('unhandledRejection', e => console.log(e))

type TypeChecker = (thing: any) => boolean
interface Types { string: TypeChecker, number: TypeChecker, array: TypeChecker, object: TypeChecker, null: TypeChecker, asyncfunction: TypeChecker, function: TypeChecker, promise: TypeChecker, map: TypeChecker, set: TypeChecker }

export const prefixWith = (prefix: string) => (m: string) => `${prefix}${snakeCase(m)}`
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
export const hasUpperCase = (m: string) => m.toLowerCase() !== m
export const proxyFn = (cb: (name: string, data?: any) => void) => new Proxy({}, { get: (_, name) => (data?: any) => cb(name as string, data) }) as { [index: string]: (data?: any) => void }

export const promisifyApi = <T>(o: object): T => onFnCall<T>((name: string, args: any[]) => new Promise((ok, no) => {
  const theFunctionToCall: Function = Reflect.get(o, name)
  theFunctionToCall(...args, (err: Error, res: any) => err ? no(err) : ok(res))
}))

export const findIndexRight = (line: string, pattern: RegExp, start: number) => {
  for (let ix = start || line.length; ix > 0; ix--) {
    if (pattern.test(line[ix])) return ix
  }
}

const { readdir, stat } = promisifyApi(fs)
export const exists = (path: string) => new Promise(fin => fs.access(path, e => fin(!e)))

const emptyStat = { isDirectory: () => false, isFile: () => false }

export const getDirFiles = async (path: string) => {
  const paths = await readdir(path) as string[]
  const filepaths = paths.map(f => ({ name: f, path: join(path, f) }))
  const filesreq = await Promise.all(filepaths.map(async f => ({
    path: f.path,
    name: f.name,
    stats: await stat(f.path).catch((_e: string) => emptyStat)
  })))
  return filesreq
    .map(({ name, path, stats }) => ({ name, path, dir: stats.isDirectory(), file: stats.isFile() }))
    .filter(m => m.dir || m.file)
}

export const requireDir = async (path: string) => {
  const dirFiles = await getDirFiles(path)
  dirFiles
    .filter(m => m.file)
    .filter(m => extname(m.name) === '.js')
    .forEach(m => require(m.path))
}

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
