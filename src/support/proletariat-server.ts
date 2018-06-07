import { getPipeName, NewlineSplitter, fromJSON, Watchers, onFnCall, proxyFn } from '../support/utils'
import { createServer } from 'net'

type EventFn = { [index: string]: (...args: any[]) => void }

export const start = (name: string) => {
  const registeredClientsOnEvents = new Watchers()
  const watchers = new Watchers()
  const pipeName = getPipeName(name)

  const publish: EventFn = onFnCall((event: string, data: any[]) => registeredClientsOnEvents.notify(event, data))
  const on = proxyFn((event: string, cb: (data: any) => void) => watchers.add(event, cb))

  const server = createServer(conn => {
    const send = (msg: any) => conn.write(JSON.stringify(msg))

    conn.pipe(new NewlineSplitter()).on('line', jsonLineHopefully => {
      const { event, args, id } = fromJSON(jsonLineHopefully).or({})
      if (!event) return

      const [ , subscribeEvent ] = event.match(/subscribe:(\w+)/)
      if (subscribeEvent) registeredClientsOnEvents.add(subscribeEvent, (data: any) => send({
        data,
        event: subscribeEvent,
      }))

      if (!id) return watchers.notify(event, ...args)

      watchers.notifyFn(event, cb => {
        const resultOrPromise = cb(...args)
        if (!resultOrPromise) return
        if (resultOrPromise.then) resultOrPromise.then((args: any) => send({ event, args, id }))
        else send({ event, id, args: resultOrPromise })
      })
    })

  })
  
  server.listen(pipeName, () => {
    console.log(`started proletariat server ${name} - listening on ${pipeName}`)
  })
  
  return { on, publish }
}
