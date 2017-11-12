import { dirname, basename, join, extname } from 'path'
import { Transform } from 'stream'
import { createServer } from 'net'
import { homedir } from 'os'
import * as fs from 'fs'

export interface Task<T> {
  done: (value: T) => void,
  promise: Promise<T>,
}

const logger = (str: TemplateStringsArray | string, v: any[]) => Array.isArray(str)
  ? console.log((str as TemplateStringsArray).map((s, ix) => s + (v[ix] || '')).join(''))
  : console.log(str as string)

export const log = (str: TemplateStringsArray | string, ...vars: any[]) => logger(str, vars)

process.on('unhandledRejection', e => console.log(e))

type TypeChecker = (thing: any) => boolean
interface Types { string: TypeChecker, number: TypeChecker, array: TypeChecker, object: TypeChecker, null: TypeChecker, asyncfunction: TypeChecker, function: TypeChecker, promise: TypeChecker, map: TypeChecker, set: TypeChecker }

export const $HOME = homedir()
export const configPath = process.env.XDG_CONFIG_HOME || (process.platform === 'win32'
  ? `${$HOME}/AppData/Local`
  : `${$HOME}/.config`)

export const toJSON = (m: any) => JSON.stringify(m)
export const fromJSON = (m: string) => ({ or: (defaultVal: any) => { try { return JSON.parse(m) } catch(_) { return defaultVal } }})
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
export const camelCase = (m: string) => m[0].toLowerCase() + m.slice(1)
export const snakeCase = (m: string) => m.split('').map(ch => /[A-Z]/.test(ch) ? '_' + ch.toLowerCase(): ch).join('')
export const mergeValid = (target: any, source: any) => Object.entries(source).reduce((tar, [k, v]) => (v && Reflect.set(tar, k, v), tar), target)
export const hasUpperCase = (m: string) => m.toLowerCase() !== m
export const proxyFn = (cb: (name: string, data?: any) => void) => new Proxy({}, { get: (_, name) => (data?: any) => cb(name as string, data) }) as { [index: string]: (data?: any) => void }
export const uriToPath = (m: string) => m.replace(/^\S+:\/\//, '')
export const uriAsCwd = (m = '') => dirname(uriToPath(m)) 
export const uriAsFile = (m = '') => basename(uriToPath(m)) 
export const CreateTask = <T>(): Task<T> => ( (done = (_: T) => {}, promise = new Promise<T>(m => done = m)) => ({ done, promise }) )()

export const promisifyApi = <T>(o: object): T => onFnCall<T>((name: string, args: any[]) => new Promise((ok, no) => {
  const theFunctionToCall: Function = Reflect.get(o, name)
  theFunctionToCall(...args, (err: Error, res: any) => err ? no(err) : ok(res))
}))

export const findIndexRight = (line: string, pattern: RegExp, start: number) => {
  for (let ix = start || line.length; ix > 0; ix--) {
    if (pattern.test(line[ix])) return ix
  }
}

export const { readdir, stat, readFile } = promisifyApi(fs)
export const exists = (path: string) => new Promise(fin => fs.access(path, e => fin(!e)))

const emptyStat = { isDirectory: () => false, isFile: () => false }

export const getDirFiles = async (path: string) => {
  const paths = await readdir(path).catch((_e: string) => []) as string[]
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

export const EarlyPromise = (init: (resolve: (resolvedValue: any) => void, reject: (error: any) => void) => void) => {
  let delayExpired = false
  const promise = new Promise(init)
  const eventually = (cb: (value: any) => void) => promise.then(val => delayExpired && cb(val))
  const maybeAfter = ({ time, or: defaultValue }: { time: number, or: any }) => Promise.race([
    promise.then(val => !delayExpired ? val : undefined),
    new Promise(fin => setTimeout(() => (delayExpired = true, fin(defaultValue)), time))
  ])

  return { maybeAfter, eventually, fail: promise.catch }
}

export const requireDir = async (path: string) => (await getDirFiles(path))
  .filter(m => m.file)
  .filter(m => extname(m.name) === '.js')
  .forEach(m => require(m.path))

export function debounce (fn: Function, wait = 1) {
  let timeout: NodeJS.Timer
  return function(this: any, ...args: any[]) {
    const ctx = this
    clearTimeout(timeout)
    timeout = setTimeout(() => fn.apply(ctx, args), wait)
  }
}

const pathGet = (obj: any, paths: string[]): any => {
  if (!paths.length) return obj
  const next = Reflect.get(obj, paths[0])
  if (next == null) return obj
  return pathGet(next, paths.slice(1))
}

export const getInObjectByPath = (obj: any, path: string) => pathGet(obj, path.split('.'))

export const getOpenPort = (): Promise<number> => new Promise((done, fail) => {
  const server = createServer()
  server.unref()
  server.on('error', () => fail(0))
  server.listen(0, () => {
    const port = server.address().port
    server.close(() => done(port))
  })
})

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

  notifyStartingWith(event: string, ...args: any[]) {
    Array
      .from(this.entries())
      .filter(m => m[0].startsWith(event))
      .map(m => m[1])
      .forEach(m => m.forEach(cb => cb(...args)))
  }

  remove(event: string, handler: Function) {
    this.has(event) && this.get(event)!.delete(handler)
  }
}

export class NewlineSplitter extends Transform {
  private buffer: string

  constructor() {
    super({ encoding: 'utf8' })
    this.buffer = ''
  }

  _transform(chunk: string, _: any, done: Function) {
    const pieces = ((this.buffer != null ? this.buffer : '') + chunk).split(/\r?\n/)
    this.buffer = pieces.pop() || ''
    pieces.forEach(line => this.push(line))
    done()
  }
}
