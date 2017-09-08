import { connect as connectToServerOn, Server } from './channel'
import { spawn } from 'child_process'

const servers = new Map<string, (port: number) => Server>()

servers.set('javascript', port => {
  spawn('node', [
    require.resolve('js-langs'),
    port + ''
  ])

  return connectToServerOn(port)
})

servers.set('typescript', port => {
  spawn('node', [
    'node_modules/javascript-typescript-langserver/lib/language-server.js',
    '-p',
    port + ''
  ])

  return connectToServerOn(port)
})


export const hasServerFor = (type: string) => servers.has(type)

export const startServerFor = (type: string, port: number) => {
  const starter = servers.get(type)
  if (!starter) return
  return starter(port)
}
