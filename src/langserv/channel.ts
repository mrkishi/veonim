import { ID, Watchers } from '../utils'
import { createConnection } from 'net'

type OnErrorCallback = (error: any) => void

export interface Server {
  request(method: string, params?: any): Promise<any>,
  notify(method: string, params?: any): void,
  on(method: string, cb: (params: any[]) => any): void,
  onError(cb: OnErrorCallback): void,
}

interface Completion {
  done: Function,
  fail: Function,
}

const uuid = ID()
const watchers = new Watchers()
const pendingRequests = new Map<number, Completion>()

// TODO: handle batch (if array of multiple requests/notifications/etc)
const decode = (buf: Buffer) => {
  const json = buf.toString()
  try { return JSON.parse(json) } catch(e) { return {} }
}

const encodeJsonRpc = (data: any) => JSON.stringify({ ...data, jsonrpc: '2.0' })

export const connect = (port: number): Server => {
  let errCb: OnErrorCallback = () => {}
  const client = createConnection(port)

  client.on('data', (buf: Buffer) => {
    // TODO: handle batch (see decode)
    const { id, result, error, method, params } = decode(buf)

    if (result && pendingRequests.has(id)) {
      const { done, fail } = pendingRequests.get(id)!
      error ? fail(error) : done(result)
      pendingRequests.delete(id)
    }

    if (!method) return

    watchers.notifyFn(method, fn => {
      const maybePromise = fn(...params)
      if (id && maybePromise && maybePromise.then) maybePromise
        .then((result: any) => client.write(encodeJsonRpc({ id, result })))
        .catch((e: any) => {
          errCb(e)
          client.write(encodeJsonRpc({ id, error: { code: -32601, message: 'Method not found' } }))
        })
    })
  })

  const api = {} as Server

  api.request = (method, ...params: any[]) => {
    const id = uuid.next()
    client.write(encodeJsonRpc({ method, params, id }))
    return new Promise((done, fail) => pendingRequests.set(id, { done, fail }))
  }

  api.notify = (method, ...params: any[]) => client.write(encodeJsonRpc({ method, params }))
  api.on = (method, cb) => watchers.add(method, cb)
  api.onError = cb => errCb = cb

  return api
}
