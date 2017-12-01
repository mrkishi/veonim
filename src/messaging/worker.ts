import { onFnCall, proxyFn, Watchers, ID, CreateTask } from '../support/utils'

type EventFn = { [index: string]: (...args: any[]) => void }
type RequestEventFn = { [index: string]: (...args: any[]) => Promise<any> }

export default (name: string) => {
  const worker = new Worker(`${__dirname}/../workers/${name}.js`)
  const watchers = new Watchers()
  const pendingRequests = new Map()
  const requestId = ID()

  const call: EventFn = onFnCall((event: string, args: any[]) => worker.postMessage([event, args]))
  const on = proxyFn((event: string, cb: (data: any) => void) => watchers.add(event, cb))
  const request: RequestEventFn = onFnCall((event: string, args: any[]) => {
    const task = CreateTask()
    const id = requestId.next()
    pendingRequests.set(id, task.done)
    worker.postMessage([event, args, id])
    return task.promise
  })

  worker.onmessage = ({ data: [e, data, id] }: MessageEvent) => {
    if (id && pendingRequests.has(id)) {
      pendingRequests.get(id)(data)
      pendingRequests.delete(id)
    }

    else watchers.notify(e, ...(data || []))
  }

  return { on, call, request }
}
