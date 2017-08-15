import { proxyFn } from './utils'

export default (name: string) => {
  const worker = new Worker(`${__dirname}/workers/${name}.js`)
  const watchers = new Map<string, Function>()
  const on = proxyFn((event: string, fn: Function) => watchers.set(event, fn))
  const go = proxyFn((event: string, data?: any) => worker.postMessage([event, data]))
  worker.onmessage = ({ data: [event, data] }: MessageEvent) => watchers.has(event) && watchers.get(event)!(data)
  return { on, go }
}
