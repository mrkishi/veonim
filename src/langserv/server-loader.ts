import { connect, Server } from '@veonim/jsonrpc'
import { getOpenPort } from '../utils'
import { spawn } from 'child_process'

const servers = new Map<string, () => Promise<Server>>()
const derp = (e: any) => console.error(e)

// this is all temporary as lang servers will be registered via extensions
servers.set('javascript', async () => {
  const port = await getOpenPort().catch(derp)
  if (!port) throw `failed to get an open port. will not be able to start javascript server`

  const proc = spawn('node', [
    require.resolve('js-langs'),
    port + ''
  ])

  proc.on('error', derp)
  proc.stdout.pipe(process.stdout)
  proc.stderr.pipe(process.stderr)
  // TODO: implement server restart (if fail)
  return connect.tcp(port)
})

servers.set('typescript', async () => {
  const port = await getOpenPort().catch(derp)
  if (!port) throw `failed to get an open port. will not be able to start typescript server`

  const proc = spawn('node', [
    'node_modules/javascript-typescript-langserver/lib/language-server.js',
    '--trace',
    '--port',
    port + '',
  ])

  proc.on('error', derp)
  proc.stdout.pipe(process.stdout)
  proc.stderr.pipe(process.stderr)

  console.log('connect to ', port)

  return connect.tcp(port)
})

//servers.set('typescript', async () => {
  //const proc = spawn('node', [
    //'node_modules/javascript-typescript-langserver/lib/language-server-stdio.js',
    //'--trace',
    //'--logfile',
    //'lglog',
  //])

  //proc.on('error', derp)
  //proc.on('exit', () => console.error('IT CLOSED WHY'))
  //proc.stdout.pipe(process.stdout)
  //proc.stderr.pipe(process.stderr)

  //return connect.ipc(proc.stdout, proc.stdin)
//})

export const hasServerFor = (language: string) => servers.has(language)
export const startServerFor = (language: string) => servers.get(language)!()
