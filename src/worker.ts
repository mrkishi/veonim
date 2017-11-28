import { onFnCall, proxyFn, Watchers } from './utils'

type EventFn = { [index: string]: (...args: any[]) => void }

export default (name: string) => {
  const worker = new Worker(`${__dirname}/workers/${name}.js`)
  const watchers = new Watchers()

  const call: EventFn = onFnCall((event: string, args: any[]) => worker.postMessage([event, args]))
  const on = proxyFn((event: string, cb: (data: any) => void) => watchers.add(event, cb))

  worker.onmessage = ({ data: [e, data = []] }: MessageEvent) => watchers.notify(e, ...data)

  return { on, call }
}
