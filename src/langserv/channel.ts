import { is, ID, Watchers } from '../utils'
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

const encode = (data: any) => JSON.stringify({ ...data, jsonrpc: '2.0' })
const decode = (buf: Buffer): any[] => {
  try {
    let data = JSON.parse(buf.toString())
    if (is.array(data)) return data
    if (is.object(data)) return [data]
    else return []
  } catch(e) {
    return []
  }
}

export const connect = (port: number): Server => {
  let errCb: OnErrorCallback = () => {}
  const client = createConnection(port)

  client.on('data', (buf: Buffer) => decode(buf).forEach(data => {
    const { id, result, error, method, params } = data

    if (result && pendingRequests.has(id)) {
      const { done, fail } = pendingRequests.get(id)!
      error ? fail(error) : done(result)
      pendingRequests.delete(id)
    }

    if (!method) return

    watchers.notifyFn(method, fn => {
      const maybePromise = fn(...params)
      if (id && maybePromise && maybePromise.then) maybePromise
        .then((result: any) => client.write(encode({ id, result })))
        .catch((e: any) => {
          errCb(e)
          client.write(encode({ id, error: { code: -32601, message: 'Method not found' } }))
        })
    })
  }))

  const api = {} as Server

  api.request = (method, ...params: any[]) => {
    const id = uuid.next()
    client.write(encode({ method, params, id }))
    return new Promise((done, fail) => pendingRequests.set(id, { done, fail }))
  }

  api.notify = (method, ...params: any[]) => client.write(encode({ method, params }))
  api.on = (method, cb) => watchers.add(method, cb)
  api.onError = cb => errCb = cb

  return api
}
