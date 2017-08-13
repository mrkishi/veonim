import CreateTransport from '../transport'
import { createConnection } from 'net'

interface Client { id: number, path: string, socket: NodeJS.Socket }

const { encoder, decoder } = CreateTransport()
const clients = new Map<number, Client>()
const config = { current: -1 }
let buffer: any[] = []
let connected = false

const connectTo = ({ id, path }: { id: number, path: string }) => {
  connected = false
  const socket = createConnection(path)
  socket.on('end', () => clients.delete(id))
  clients.set(id, { id, path, socket })
}

const switchTo = (id: number) => {
  if (!clients.has(id)) return
  const { socket } = clients.get(id)!

  if (config.current > -1) {
    encoder.unpipe()
    const socketMaybe = clients.get(config.current)
    if (socketMaybe) socket.unpipe()
  }

  encoder.pipe(socket)
  socket.pipe(decoder, { end: false })

  if (buffer.length) {
    buffer.forEach(data => encoder.write(data))
    buffer = []
  }

  connected = true
  config.current = id
}

onmessage = ({ data }: MessageEvent) => {
  if (Array.isArray(data) && data[0] === 65) return connectTo(data[1])
  if (Array.isArray(data) && data[0] === 66) return switchTo(data[1])
  if (!connected) buffer.push(data)
  else encoder.write(data)
}

decoder.on('data', ([type, ...d]: [number, any]) => postMessage([ type, d ]))
