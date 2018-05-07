import { getPipeName, NewlineSplitter, fromJSON, Watchers } from '../support/utils'
import { createServer } from 'net'

export const makeTheServerVeryNiceAndFancy = (name: string) => {
  const pipeName = getPipeName(name)
  const watchers = new Watchers()
  const buffered = []
  let conn

  const send = (msg: any) => conn.write(JSON.stringify(msg))
  const call: EventFn = onFnCall((event: string, args: any[]) => postMessage([event, args]))
  const on = proxyFn((event: string, cb: (data: any) => void) => watchers.add(event, cb))

  const server = createServer(conn => {
    conn

    conn.pipe(new NewlineSplitter()).on('line', jsonLineHopefully => {
      const { event, args, id } = fromJSON(jsonLineHopefully).or({})
      if (!event) return

      if (!id) return watchers.notify(event, ...args)

      watchers.notifyFn(event, cb => {
        const resultOrPromise = cb(...args)
        if (!resultOrPromise) return
        if (resultOrPromise.then) resultOrPromise.then((args: any) => send({ event, args, id }))
        else send({ event, id, args: resultOrPromise })
      })
    })

  })
  
  

  // public api: { on, call }
  //
  // on is broadcast, the server doesn't care about the client
  // call has to be associated to a specific client... how to expose this elegantly?
  //
  // onClient(call => call('lol', 'derp'))
  //
  // actually, should there even be a client call? (like HTTP server)
  // yes, because we want to send jsonrpc messages from extension language servers back to client
  // so, should we just broadcast to all clients? maybe not all clients are interested in the
  // same stuff. should we implement a pub/sub on top of this? only send to clients which
  // have subscribed to a particular topic?
  

  // ok, so then public API:
  //
  // { on, publish }
  //
  // on -> on a msg from any client. can reply back to client via async function (like http server)
  // publish -> send a msg on a particular event namespace. all clients registered for this particular
  // namespace will receive this message. is no one registered, nothing is sent.
  //
  // client api will be:
  //
  // { on, call, request }
  //
  // on -> subscribe to a particular topic. server will sent events to clients subscribed with this topic
  // call -> send an event to the server. no reply expected
  // request -> send an event to the server and wait for a reply
  // 
  // although............................
  // our startServer function assumes only one client right now.
  // we should destructure this into two parts. one to create the process, and a separate function
  // to connect to that process. the reason for this is so that multiple threads (workers) may
  // connect to the same process, but obiously from different contexts

  console.log('starting extension host...')
  server.listen(pipeName, () => {
    console.log('extension host started right now')
    console.log(JSON.stringify({ pipeName }))
  })

  return { server }
}
