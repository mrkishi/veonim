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

  proc.on('error', e => console.log(e))
  proc.stdout.pipe(process.stdout)
  proc.stderr.pipe(process.stderr)
  // TODO: implement server restart (if fail)
  return connect.tcp(port)
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
export const startServerFor = (language: string) => servers.get(language)!()
