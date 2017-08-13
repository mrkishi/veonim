import CreateTransport from '../transport'
import { createConnection } from 'net'

interface Client { id: number, path: string, socket: NodeJS.Socket }

const { encoder, decoder } = CreateTransport()
const clients = new Map<number, Client>()
const config = { current: -1 }
let buffer: any[] = []
let connected = false

const connectTo = ({ id, path }: { id: number, path: string }) => {
  console.log(`create connect ${id}`)
  connected = false
  const socket = createConnection(path)
  socket.on('end', () => clients.delete(id))
  clients.set(id, { id, path, socket })
}

const switchTo = (id: number) => {
  console.log(`switch to ${id}`)
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
    console.log('unbuf', buffer)
    buffer.forEach(data => encoder.write(data))
    buffer = []
  }
  console.log(`hooked up pipes for ${id}`)
  //socket.on('connect', () => {
    //console.log(`socket ${id} is hooked up now!`)
    //console.log(`connected = ${connected}`)
  //})
  //if (!connected) socket.on('connect', () => {
    //console.log('unbuf', buffer)
    //buffer.forEach(data => encoder.write(data))
    //buffer = []
    //connected = true
  //})

  connected = true
  config.current = id
}

onmessage = ({ data }: MessageEvent) => {
  if (Array.isArray(data) && data[0] === 65) return connectTo(data[1])
  if (Array.isArray(data) && data[0] === 66) return switchTo(data[1])
  console.log(connected ? 'W':'B', '-->', ...data)
  if (!connected) buffer.push(data)
  else encoder.write(data)
}

decoder.on('data', ([type, ...d]: [number, any]) => postMessage([ type, d ]))
