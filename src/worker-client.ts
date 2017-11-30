import { onFnCall, proxyFn, Watchers } from './utils'

type EventFn = { [index: string]: (...args: any[]) => void }

export default () => {
  const watchers = new Watchers()

  const call: EventFn = onFnCall((event: string, args: any[]) => postMessage([event, args]))
  const on = proxyFn((event: string, cb: (data: any) => void) => watchers.add(event, cb))

  onmessage = ({ data: [e, data = [], id] }: MessageEvent) => {
    if (!id) return watchers.notify(e, ...data)

    watchers.notifyFn(e, cb => {
      const resultOrPromise = cb(...data)
      if (!resultOrPromise) return
      if (resultOrPromise.then) resultOrPromise.then((res: any) => postMessage([e, res, id]))
      else postMessage([e, resultOrPromise, id])
    })

  }

  return { on, call }
}
