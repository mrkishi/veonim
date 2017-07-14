import { encode, decode, createEncodeStream, createDecodeStream, createCodec } from 'msgpack-lite'
import { spawn } from 'child_process'
import { dev, Watcher, onFnCall, snakeCase } from './utils'
import { Api } from './api'
const asVimFn = (m: string) => `nvim_${snakeCase(m)}`

const wtf = class WHATTHEFUCK {
  public val: any
  constructor (data: any) {
    this.val = data
  }
}

const codec = createCodec()

codec.addExtPacker(0, wtf, (data: any) => encode(data))
codec.addExtPacker(1, wtf, (data: any) => encode(data))
codec.addExtPacker(2, wtf, (data: any) => encode(data))

codec.addExtUnpacker(0, data => new wtf(decode(data)))
codec.addExtUnpacker(1, data => new wtf(decode(data)))
codec.addExtUnpacker(2, data => new wtf(decode(data)))

const { stdout, stdin } = spawn('nvim', ['--embed', ...process.argv.slice(2)]).on('exit', (c: number) => {
  // TODO: kill it with fire
  dev `nvim exit ${c}`
})

// TODO: figure out why people are morons
const stupidEncoder = createEncodeStream({ codec })
const encoder = stupidEncoder.pipe(stdin)
const decoder = createDecodeStream({ codec })
stdout.pipe(decoder)

const watchers = new Watcher()
const pendingRequests = new Map()
const requestHandlers = new Map<string, Function>()

let reqId = 0
let onRedrawFn = (m: any[]) => m

const send = (m: any[]) => encoder.write(encode(m)) && dev `<-- [${m}]`
const notify = (name: string, args: any[]) => send([2, name, args])

const request = (name: string, args: any[]) => {
  send([0, ++reqId, name, args])
  return new Promise((done, fail) => pendingRequests.set(reqId, { done, fail }))
}

const noRequestMethodFound = (id: number, method: string) => {
  send([1, id, 'no one was listening for your request, sorry', null])
  dev `vim made a request for ${method} but no handler was found`
}

const onVimRequest = (id: number, method: string, args: any[]) => {
  const reqHandler = requestHandlers.get(method)
  if (!reqHandler) return noRequestMethodFound(id, method)

  const maybePromise = reqHandler(...args as any[])

  if (maybePromise && maybePromise.then) maybePromise
    .then((result: any) => send([1, id, null, result]))
    .catch((err: string) => send([1, id, err, null]))
}

const onResponse = (id: number, error: string, result: any) => {
  if (!pendingRequests.has(id)) return

  const { done, fail } = pendingRequests.get(id)
  error ? fail(error) : done(result)
  pendingRequests.delete(id)
}

const onNotification = (method: string, args: any[]) => method === 'redraw'
  ? onRedrawFn(args)
  : watchers.notify(method, args)

decoder.on('data', ([ type, ...d ]: [ number, string | Buffer | any[] ]) => {
  dev `--> [${[type, ...d]}]`

  if (type === 0) onVimRequest(d[0] as number, d[1].toString(), d[2] as any[])
  else if (type === 1) onResponse(d[0] as number, d[1] as string, d[2])
  else if (type === 2) onNotification(d[0].toString(), d[1] as any[])
  else dev `i don't know how to handle this msg type: ${type}`
})

export const req: Api = onFnCall((name: string, args: any[] = []) => request(asVimFn(name), args))
export const api: Api = onFnCall((name: string, args: any[]) => notify(asVimFn(name), args))
export const on = (event: string, fn: Function) => watchers.add(event, fn)
export const onRedraw = (fn: Function) => onRedrawFn = fn as { (m: any[]): any[] }
export const onRequest = (event: string, fn: Function) => requestHandlers.set(event, fn)
export const subscribe = (event: string, fn: Function) => {
  api.subscribe(event)
  watchers.add(event, fn)
  return () => api.unsubscribe(event) && watchers.remove(event, fn)
}
