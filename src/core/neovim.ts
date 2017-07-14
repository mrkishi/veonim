import { encode, decode, createEncodeStream, createDecodeStream, createCodec } from 'msgpack-lite'
import { spawn } from 'child_process'
import { log } from './logger'
import { onFnCall, snakeCase } from './utils'
import { Api } from './api'
import { Functions } from './functions'
import Watcher from './watcher'

const wtf = class WHATTHEFUCK {
  public val: any
  constructor (data: any) {
    this.val = data
  }
}

const asVimFn = (m: string) => `nvim_${snakeCase(m)}`

const codec = createCodec()

codec.addExtPacker(0, wtf, (data: any) => encode(data))
codec.addExtPacker(1, wtf, (data: any) => encode(data))
codec.addExtPacker(2, wtf, (data: any) => encode(data))

codec.addExtUnpacker(0, data => new wtf(decode(data)))
codec.addExtUnpacker(1, data => new wtf(decode(data)))
codec.addExtUnpacker(2, data => new wtf(decode(data)))

const vimArgs = process.argv.slice(2)
const { stdout, stdin } = spawn('nvim', ['--embed', ...vimArgs]).on('exit', (c: number) => {
  // TODO: kill it with fire
  log `exit ${c}`
})

// TODO: figure out why people are morons
const stupidEncoder = createEncodeStream({ codec })
const encoder = stupidEncoder.pipe(stdin)
const toVim = (m: any[]) => encoder.write(encode(m)) // <-- wtf?!

const decoder = createDecodeStream({ codec })
stdout.pipe(decoder)

const pendingRequests = new Map()
const w = {
  notifications: new Watcher(),
  events: new Watcher(),
  actions: new Watcher()
}

const requestHandlers = new Map<string, Function>()

let reqId = 0
let onRedrawFn = (m: any[]) => m

const send = (m: any[]) => toVim(m) && log `<-- [${m}]`
const notify = (name: string, args: any[]) => send([2, name, args])
const api: Api = onFnCall((name: string, args: any[]) => notify(asVimFn(name), args))

const request = (name: string, args: any[]) => {
  send([0, ++reqId, name, args])
  return new Promise((done, fail) => pendingRequests.set(reqId, { done, fail }))
}

const noRequestMethodFound = (id: number, method: string) => {
  send([1, id, 'no one was listening for your request, sorry', null])
  log `vim made a request for ${method} but no handler was found`
}

decoder.on('data', ([ type, ...data ]: [ number, any[] ]) => {
  log `--> [${[type, ...data]}]`

  // vim requests a reponse
  if (type === 0) {
    const [ id, method, args ] = data as [ number, string, any[] ]

    const reqHandler = requestHandlers.get(method)
    if (!reqHandler) return noRequestMethodFound(id, method)

    const maybePromise = reqHandler(...args as any[])

    if (maybePromise && maybePromise.then) maybePromise
      .then((result: any) => send([1, id, null, result]))
      .catch((err: string) => send([1, id, err, null]))
  }

  // received response from previous request
  else if (type === 1) {
    const [ id, error, result ] = data
    if (!pendingRequests.has(id)) return

    const { done, fail } = pendingRequests.get(id)
    error ? fail(error) : done(result)
    pendingRequests.delete(id)
  }

  // notification/event
  else if (type === 2) {
    const [ methodRaw, args ] = data
    const method = methodRaw.toString()

    if (method === 'redraw') onRedrawFn(args as any[])
    else {
      w.notifications.notify(method, args)
      w.events.notify(method, args)
    }
  }

  else log `i don't know how to handle this msg type: ${type}`
})

stdin.on('error', (e: Error) => log `STDIN ERROR ${e}`)
stdout.on('error', (e: Error) => log `STDOUT ERROR ${e}`)

export const on = (event: string, fn: Function) => w.notifications.add(event, fn)
const req: Api = onFnCall((name: string, args: any[] = []) => request(asVimFn(name), args))
export const call: Functions = onFnCall((name: string, args: any[] = []) => req.callFunction(name, args))

const baseAttachOpts = {
  rgb: false,
  ext_popupmenu: false,
  ext_tabline: false,
  ext_wildmenu: false,
  ext_cmdline: false
}

export const onRedraw = (fn: Function) => onRedrawFn = fn as { (m: any[]): any[] }
export const attach = (width: number, height: number, opts = baseAttachOpts) => api.uiAttach(width, height, { ...baseAttachOpts, ...opts })
export const resize = (width: number, height: number) => api.uiTryResize(width, height)
export const input = (m: string) => api.input(m)
export const cmd = (m: string) => api.command(m)
export const action = (event: string, fn: Function) => w.actions.add(event, fn)
export const onVimRequest = (event: string, fn: Function) => requestHandlers.set(event, fn)

export const subscribe = (event: string, fn: Function) => {
  api.subscribe(event)
  w.events.add(event, fn)

  return () => {
    api.unsubscribe(event)
    // TODO: NYI
    //w.events.delete(event)
  }
}

subscribe('veonim', ([ event, ...args ]) => w.actions.notify(event, args))

export const buffers = () => req.listBufs()
