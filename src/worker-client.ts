import { onFnCall, proxyFn, Watchers } from './utils'

type EventFn = { [index: string]: (...args: any[]) => void }

export default () => {
  const watchers = new Watchers()

  const call: EventFn = onFnCall((event: string, args: any[]) => postMessage([event, args]))
  const on = proxyFn((event: string, cb: (data: any) => void) => watchers.add(event, cb))

  onmessage = ({ data: [e, data = []] }: MessageEvent) => watchers.notify(e, ...data)

  return { on, call }
}
