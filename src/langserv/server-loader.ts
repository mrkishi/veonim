import { connect, Server } from '@veonim/jsonrpc'
import { spawn } from 'child_process'

const servers = new Map<string, () => Promise<Server>>()

servers.set('typescript', async () => {
  const proc = spawn('node', [
    'node_modules/javascript-typescript-langserver/lib/language-server-stdio.js',
    '--trace',
  ])

  //proc.on('error', e => console.error('err in ts server', e))

  //proc.stdout.on('data', b => {
    //console.log('>>', b+'')
  //})

  //proc.stderr.on('data', b => {
    //console.log('!!',b+'')
  //})

  return connect.ipc(proc)
})

servers.set('javascript', async () => {
  const proc = spawn('node', [
    'node_modules/javascript-typescript-langserver/lib/language-server-stdio.js',
    '--trace',
  ])

  return connect.ipc(proc)
})

export const hasServerFor = (language: string) => servers.has(language)
export const startServerFor = (language: string) => servers.get(language)!()
