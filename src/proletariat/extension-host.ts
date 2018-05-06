import { getPipeName } from '../support/utils'
import { createServer } from 'net'

const server = createServer(socket => {
  socket.on('data', m => {
    console.log(m+'')
  })
})

const pipeName = getPipeName('veonim:extension-host')

console.log('starting extension host...')
server.listen(pipeName, () => {
  console.log('extension host started right now')
  console.log(JSON.stringify({ pipeName }))
})
