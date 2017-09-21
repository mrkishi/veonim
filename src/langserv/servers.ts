import { connect as connectToServerOn, Server } from './channel'
import { spawn } from 'child_process'
import { delay } from '../utils'

const servers = new Map<string, (port: number) => Promise<Server>>()

servers.set('javascript', async port => {
  const proc = spawn('node', [
    require.resolve('js-langs'),
    port + ''
  ])

  proc.on('error', e => console.log(e))
  proc.stdout.pipe(process.stdout)
  proc.stderr.pipe(process.stderr)
  // TODO: have channel client buffer requests until server has started. need hook to know when server is running
  // TODO: implement client reconnect and server restart (if fail)
  await delay(1e3)
  return connectToServerOn(port)
})

// TODO: soon. TS server sends requests for files from workspace that need to be fulfilled
//servers.set('typescript', port => {
  //spawn('node', [
    //'node_modules/javascript-typescript-langserver/lib/language-server.js',
    //'-p',
    //port + ''
  //])

  //return connectToServerOn(port)
//})


export const hasServerFor = (language: string) => servers.has(language)
export const startServerFor = (language: string, port: number) => servers.get(language)!(port)
