// TODO: TS pls?
const jayson = require('jayson')
// TODO: figure out rpc lib that works with net/stdio and has promises/proxies/etc
import { spawn } from 'child_process'

type OnDataCallback = (data: any) => void
export interface Server {
  // TODO: call function instead via proxy to rpc
  write(data: any): void,
  onData(cb: OnDataCallback): void,
}

const servers = new Map<string, (port: number | string) => Server>()

servers.set('javascript', port => {
  spawn('node', [
    require.resolve('js-langs'),
    port + ''
  ])

  let dataCb: OnDataCallback

  return {
    write: m => console.log(m),
    onData: cb => dataCb = cb,
  } as Server
})

servers.set('typescript', port => {
  spawn('node', [
    'node_modules/javascript-typescript-langserver/lib/language-server.js',
    '-p',
    port + ''
  ])

  let dataCb: OnDataCallback

  return {
    write: m => console.log(m),
    onData: cb => dataCb = cb,
  } as Server
})

export const startServerFor = (type: string, port: number | string) => {
  const starter = servers.get(type)
  if (!starter) return
  return starter(port)
}
