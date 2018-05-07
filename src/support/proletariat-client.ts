import { Watchers, onFnCall, CreateTask, ID, proxyFn, NewlineSplitter, fromJSON } from '../support/utils'
import { createConnection } from 'net'
import { spawn } from 'child_process'
import { join } from 'path'

type EventFn = { [index: string]: (...args: any[]) => void }
type RequestEventFn = { [index: string]: (...args: any[]) => Promise<any> }

export const joinRevolution = (pipeName: string) => {
  const watchers = new Watchers()
  const pendingRequests = new Map()
  const requestId = ID()
  const conn = createConnection(pipeName)

  const send = (stuff: any) => conn.write(JSON.stringify(stuff) + '\r\n')
  const call: EventFn = onFnCall((event: string, args: any[]) => send({ event, args }))

  const on = proxyFn((event: string, cb: (data: any) => void) => {
    watchers.add(event, cb)
    send({ event: `subscribe:${event}` })
  })

  const request: RequestEventFn = onFnCall((event: string, args: any[]) => {
    const task = CreateTask()
    const id = requestId.next()
    pendingRequests.set(id, task.done)
    send({ event, args, id })
    return task.promise
  })

  conn.pipe(new NewlineSplitter()).on('data', (jsonLineHopefully: string) => {
    const { event, args, id } = fromJSON(jsonLineHopefully).or({})
    if (!event) return

    if (id && pendingRequests.has(id)) {
      pendingRequests.get(id)(args)
      pendingRequests.delete(id)
    }

    else watchers.notify(event, ...args)
  })

  return { on, call, request }
}

export const startRevolution = (name: string) => {
  const getPipeNameTask = CreateTask<string>()
  const theBourgeoisieHateHim = join(__dirname, '..', 'proletariat', `${name}.js`)
  const proc = spawn(process.execPath, [theBourgeoisieHateHim], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: true },
  })

  proc.stderr.on('data', data => console.error(`@${name}@`, data.toString()))

  proc.stdout.pipe(new NewlineSplitter()).on('data', (line: string) => {
    const { pipeName } = fromJSON(line).or({})
    if (pipeName) getPipeNameTask.done(pipeName)
    console.log(`@${name}@`, line)
  })

  proc.on('exit', code => console.log(`proletariat ${name} has left the revolution: ${code}`))
  proc.on('error', console.error)

  if (process.env.VEONIM_DEV) {
    const ipc = require('electron').ipcRenderer
    ipc.on('dev:reload', () => proc.kill())
  }

  return { proc, getName: getPipeNameTask.promise }
}
