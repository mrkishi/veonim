import { Watchers, onFnCall } from './utils'

type StrFnObj = { [index: string]: Function }
export type RemoteApiMirror = <T = StrFnObj>() => T

const getTypeAndName = (werd: string) => {
  const [ , type = null, name = null ] = werd.match(/^reg\.(\w+):(\S+)/) || []
  return { type, name }
}

export default (send: (event: string, msg: any, id?: number) => void) => {
  let reqId = 1
  const watchers = new Watchers()
  const pendingRequests = new Map()
  const apis: any[] = []

  const callFnAndSendResultBackMaybe = (event: string, fn: Function, args: any[], id: number) => {
    const maybePromise = fn(...args)
    if (id && maybePromise && maybePromise.then) maybePromise
      .then((res: any) => send(event, res, id))
      .catch((e: any) => watchers.notify('error', e))
  }

  const registerEvent = (event: string) => apis.forEach((api: object) => {
    const { type, name } = getTypeAndName(event)
    const fn = Reflect.get(api, type || '')
    if (!fn) return
    fn(name, (...args: any[]) => send(`${type}:${name}`, args))
  })

  const onRecv = ({ data }: MessageEvent) => {
    if (!data || !Array.isArray(data) || !data[0]) return
    const [event, args = [], id] = data

    if (event.startsWith('reg.')) return registerEvent(event)

    const handledByApis = apis.map((api: object) =>
      Reflect.has(api, event) && !callFnAndSendResultBackMaybe(event, Reflect.get(api, event), args, id)
    ).some(a => a)

    if (handledByApis) return
    if (id) watchers.notifyFn(event, cb => callFnAndSendResultBackMaybe(event, cb, args, id))
    else watchers.notify(event, ...args)

    if (id && pendingRequests.has(id)) {
      pendingRequests.get(id)(args)
      pendingRequests.delete(id)
    }
  }

  const publishApi = <T>(api: T) => apis.push(api)

  const sub = (type: string) => (name: string, cb: (...args: any[]) => void) => {
    send(`reg.${type}:${name}`, [])
    watchers.add(`${type}:${name}`, cb)
  }

  const on: StrFnObj = onFnCall((name, args) => watchers.add(name, args[0]))
  const Notifier: RemoteApiMirror = <T>() => onFnCall<T>((method, args) => send(method, args))
  const Requester: RemoteApiMirror = <T>() => onFnCall<T>((method, args) => {
    reqId += 1
    send(method, args, reqId)
    return new Promise(done => pendingRequests.set(reqId, done))
  })

  return { sub, on, Notifier, Requester, onRecv, publishApi }
}