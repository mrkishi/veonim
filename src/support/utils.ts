import { dirname, basename, join, extname, resolve } from 'path'
import { exec, execFile } from 'child_process'
const watch = require('node-watch')
import { Transform } from 'stream'
import { createServer } from 'net'
import * as fs from 'fs-extra'
import { homedir } from 'os'

export interface Task<T> {
  done: (value: T) => void,
  promise: Promise<T>,
}

const logger = (str: TemplateStringsArray | string, v: any[]) => Array.isArray(str)
  ? console.log((str as TemplateStringsArray).map((s, ix) => s + (v[ix] || '')).join(''))
  : console.log(str as string)

export const log = (str: TemplateStringsArray | string, ...vars: any[]) => logger(str, vars)

process.on('unhandledRejection', e => console.error(e))

type TypeChecker = (thing: any) => boolean
interface Types { string: TypeChecker, number: TypeChecker, array: TypeChecker, object: TypeChecker, null: TypeChecker, asyncfunction: TypeChecker, function: TypeChecker, promise: TypeChecker, map: TypeChecker, set: TypeChecker }

export const $HOME = homedir()
export const configPath = process.env.XDG_CONFIG_HOME || (process.platform === 'win32'
  ? `${$HOME}/AppData/Local`
  : `${$HOME}/.config`)

export const listof = (count: number, fn: () => any) => [...Array(count)].map(fn)
export const clearStack = () => new Promise(fin => setImmediate(fin))
export const toJSON = (m: any) => JSON.stringify(m)
export const fromJSON = (m: string) => ({ or: (defaultVal: any) => { try { return JSON.parse(m) } catch(_) { return defaultVal } }})
export const prefixWith = (prefix: string) => (m: string) => `${prefix}${snakeCase(m)}`
export const merge = Object.assign
export const cc = (...a: any[]) => Promise.all(a)
export const delay = (t: number) => new Promise(d => setTimeout(d, t))
export const ID = (val = 0) => ({ next: () => (val++, val) })
export const $ = (...fns: Function[]) => (...a: any[]) => fns.reduce((res, fn, ix) => ix ? fn(res) : fn(...res), a)
export const type = (m: any) => (Object.prototype.toString.call(m).match(/^\[object (\w+)\]/) || [])[1].toLowerCase()
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
export const Deferred = () => ( (ok = (_: any) => {}, no = () => {}, p = new Promise((y, n) => (ok = y, no = n))) => ({ done: ok, fail: no, promise: p }) )()
export const uuid = (): string => (<any>[1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,(a: any)=>(a^Math.random()*16>>a/4).toString(16))
export const shell = (cmd: string, opts?: object): Promise<string> => new Promise(fin => exec(cmd, opts, (_, out) => fin(out + '')))
export const run = (cmd: string, opts?: object): Promise<string> => new Promise(fin => execFile(cmd, opts, (_, out) => fin(out + '')))

export const commandExists = (cmd: string) => new Promise(done => {
  const checker = process.platform === 'win32' ? 'where' : 'command -v'
  exec(`${checker} ${cmd}`, (err, stdout) => {
    if (err) return done(false)
    return done(!!stdout)
  })
})

export const pathRelativeToHome = (path: string) => path.includes($HOME)
  ? path.replace($HOME, '~')
  : path

export const pathRelativeToCwd = (path: string, cwd: string) => path.includes(cwd)
  ? path.replace(cwd, '').replace(/^\//, '')
  : path

// TODO: i don't think this does what you think it does. try giving ./relative/path
export const absolutePath = (path: string) => resolve(path.replace(/^~\//, `${homedir()}/`))

export const resolvePath = (path: string, dir: string) => {
  if (path.startsWith('/')) return resolve(path)
  if (path.startsWith('~/')) return resolve(path.replace(/^~\//, `${homedir()}/`))
  if (path.startsWith('./') || path.startsWith('../')) return join(dir, path)
}

export const simplifyPath = (fullpath: string, cwd: string) => fullpath.includes(cwd)
  ? fullpath.split(cwd + '/')[1]
  : fullpath.includes($HOME) ? fullpath.replace($HOME, '~') : fullpath

export const pathReducer = (p = '') => ((p, levels = 0) => ({ reduce: () =>
  levels ? basename(join(p, '../'.repeat(levels++))) : (levels++, basename(p))
}))(p)

export const watchPath = (path: string, callback: () => void) => watch(path, callback)

export const watchPathSymlink = (path: string, callback: () => void) => {
  const throttledCallback = throttle(callback, 15)
  return fs.watch(path, () => throttledCallback())
}

export const match = (...opts: [boolean, any][]): any => new Map(opts).get(true)
export const matchOn = (val: any) => (opts: object): any => (Reflect.get(opts, val) || (() => {}))()

interface BackoffParams {
  factor?: number,
  maxAttempts?: number,
  initialDelay?: number,
  timeout?: number,
  action: (tryAgain: () => void) => any,
}

export const Backoff = ({ factor = 1.5, maxAttempts = 5, initialDelay = 10, timeout, action }: BackoffParams) => {
  let iteration = 0
  let delay = initialDelay
  let timer: NodeJS.Timer
  const task = Deferred()
  const goodAndDone = (value: any) => (clearTimeout(timer), task.done(value))

  const next = () => {
    iteration += 1
    if (iteration > maxAttempts) return task.fail()
    setTimeout(() => {
      const res = action(() => next())
      if (res && typeof (res as any).then === 'function') (res as Promise<boolean>).then(val => val != null && goodAndDone(val)).catch(task.fail)
      else if (res != null) goodAndDone(res)
      else next()
    }, delay *= factor)
  }

  return () => {
    next()
    if (timeout) timer = setTimeout(() => (iteration = maxAttempts + 1, task.fail()), timeout)
    return task.promise
  }
}

export const isOnline = (host = 'google.com') => new Promise(fin => {
  require('dns').lookup(host, (e: any) => fin(!(e && e.code === 'ENOTFOUND')))
})

export const findIndexRight = (line: string, pattern: RegExp, start: number) => {
  for (let ix = start || line.length; ix > 0; ix--) {
    if (pattern.test(line[ix])) return ix
  }
}

export const asColor = (color: number) => '#' + [16, 8, 0].map(shift => {
  const mask = 0xff << shift
  const hex = ((color & mask) >> shift).toString(16)
  return hex.length < 2 ? ('0' + hex) : hex
}).join('')

export const { readdir, stat, writeFile } = fs
export const readFile = (path: string, encoding = 'utf8') => fs.readFile(path, encoding)
export const exists = (path: string): Promise<boolean> => new Promise(fin => fs.access(path, e => fin(!e)))

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

export const getDirs = async (path: string) => (await getDirFiles(path)).filter(m => m.dir)
export const getFiles = async (path: string) => (await getDirFiles(path)).filter(m => m.file)

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

export const requireDirSync = (path: string) => {
  const items = fs.readdirSync(path).map(m => ({
    name: m,
    path: join(path, m),
  }))

  const files = items
    .filter(m => fs.statSync(m.path).isFile())
    .filter(m => extname(m.name) === '.js')

  return files.map(m => require(m.path))
}

export const requireDir = async (path: string) => (await getDirFiles(path))
  .filter(m => m.file)
  .filter(m => extname(m.name) === '.js')
  .map(m => require(m.path))

export function debounce (fn: Function, wait = 1) {
  if (!fn) throw new Error('bruh, ya need a function here!')
  let timeout: NodeJS.Timer
  return function(this: any, ...args: any[]) {
    const ctx = this
    clearTimeout(timeout)
    timeout = setTimeout(() => fn.apply(ctx, args), wait)
  }
}

export const throttle = (fn: (...args: any[]) => void, delay: number) => {
  let throttling = false
  let args: any[] | undefined

  const executor = (...a: any[]) => {
    if (throttling) return (args = a, undefined)
    throttling = true
    fn(...a)
    setTimeout(() => (throttling = false, args && (executor(...args), args = undefined)), delay)
  }

  return executor
}

export const limitedInterval = (fn: (...args: any[]) => void, interval: number, delay: number) => {
  fn()
  const timer = setInterval(fn, interval)
  setTimeout(() => clearInterval(timer), delay)
  return { stop: () => clearInterval(timer) }
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
