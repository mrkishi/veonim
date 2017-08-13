import { encoder, decoder } from '../transport'
import { createConnection } from 'net'

interface Client { id: number, path: string, socket: NodeJS.Socket }

const clients = new Map<number, Client>()
const config = { current: -1 }

const connectTo = ({ id, path }: { id: number, path: string }) => {
  console.log(`WW: trying to connect vim ${id} @ ${path}`)
  const socket = createConnection(path, () => {
    console.log(`WW: connected to vim ${id} @ ${path}`)
  })

  socket.on('end', () => console.log('blarg quit'))
  clients.set(id, { id, path, socket })
}

const switchTo = (id: number) => {
  if (!clients.has(id)) return
  const { socket, path } = clients.get(id)!

  console.log(`WW: SWITching to vim ${id} on ${path}`)

  if (config.current > -1) {
    encoder.unpipe()
    clients.get(config.current)!.socket.unpipe()
  }

  encoder.pipe(socket)
  socket.pipe(decoder, { end: false })

  config.current = id
}

onmessage = ({ data }: MessageEvent) => {
  if (Array.isArray(data) && data[0] === 65) return connectTo(data[1])
  if (Array.isArray(data) && data[0] === 66) return switchTo(data[1])
  encoder.write(data)
}

decoder.on('data', ([type, ...d]: [number, any]) => postMessage([ type, d ]))
