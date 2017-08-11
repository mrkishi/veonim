import { encoder, decoder } from '../transport'
import { createConnection as connect } from 'net'

// TODO: hook into socket name
const cli = connect({ port: 8442 }, () => {
  console.log('connected to blarg')
})

cli.on('end', () => console.log('blarg quit'))

// TODO: are we going to swap pipes or route?
encoder.pipe(cli)
cli.pipe(decoder)

onmessage = ({ data }: MessageEvent) => encoder.write(data)
decoder.on('data', postMessage)
