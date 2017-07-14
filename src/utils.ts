import { createWriteStream } from 'fs'

const logger = createWriteStream('logs')
const logmsg = (m: string) => logger.write(`${JSON.stringify(m)}\n`)

// TODO: make log method either accept template string or function with string arg
export const log = (str: TemplateStringsArray, ...v: any[]) => logmsg(str.map((s, ix) => s + (v[ix] || '')).join(''))
//const log = (str: TemplateStringsArray, ...v: any[]) => [str, v]
//
// TODO: expose log, err, dev (debug) log levels to be toggled via cmd-line opts?

process.on('unhandledRejection', logmsg)

export const merge = Object.assign

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

export const type = (m: any) => {
  const [ , type ] = Object.prototype.toString.call(m).match(/^\[object (\w+)\]/g)
  return (type || 'undefined').toLowerCase()
}

export const is = new Proxy<Types>({} as Types, { get: (_, key) => (val: any) => type(val) === key })

export const onProp = <T>(cb: Function): T => new Proxy({}, { get: (_, name) => cb(name) }) as T
export const onFnCall = <T>(cb: Function): T => new Proxy({}, { get: (_, name) => (...args: any[]) => cb(name, args) }) as T

export const pascalCase = (m: string) => m[0].toUpperCase() + m.slice(1)
export const snakeCase = (m: string) => m.split('').map(ch => /[A-Z]/.test(ch) ? '_' + ch.toLowerCase(): ch).join('')

export const promisifyApi = <T>(o: object): T => onFnCall<T>((name: string) => (...args: any[]) => new Promise((ok, no) => {
  const theFunctionToCall: Function = Reflect.get(o, name)
  theFunctionToCall(...args, (err: Error, res: any) => err ? no(err) : ok(res))
}))

export class Watcher extends Map<string, Set<Function>> {
  constructor() {
    super()
  }

  add(event: string, handler: Function) {
    const handlers = this.get(event)
    if (!handlers || !handlers.size) this.set(event, new Set<Function>([ handler ]))
    else handlers.add(handler)
  }

  notify(event: string, ...args: any[]) {
    const handlers = this.get(event)
    if (!handlers || !handlers.size) return
    handlers.forEach(cb => cb(...args))
  }

  remove(event: string, handler: Function) {
    const handlers = this.get(event)
    if (!handlers || !handlers.size) return
    handlers.delete(handler)
  }
}
