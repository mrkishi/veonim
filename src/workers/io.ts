console.log('worker started wohoo')
import { spawn } from 'child_process'

setInterval(() => {
  const ls = spawn('ls', ['-l', '/Users/a/Documents/projects'])
  ls.stdout.on('data', e => postMessage(e.toString()))
}, 5e3)

onmessage = e => {
  console.log('worker recv', e.data)
}
