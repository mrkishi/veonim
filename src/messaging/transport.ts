import { encode, decode, createEncodeStream, createDecodeStream, createCodec } from 'msgpack-lite'
import { ExtType } from '../core/api'

const ExtContainer = (kind: number, id: any) => ({ kind, id, extContainer: true })

interface Encoder {
  unpipe(): NodeJS.WritableStream,
  pipe(stdin: NodeJS.WritableStream): NodeJS.WritableStream,
  write(data: any): boolean,
}

export default () => {
  const codec = createCodec()

  codec.addExtUnpacker(ExtType.Buffer, data => ExtContainer(ExtType.Buffer, decode(data)))
  codec.addExtUnpacker(ExtType.Window, data => ExtContainer(ExtType.Window, decode(data)))
  codec.addExtUnpacker(ExtType.Tabpage, data => ExtContainer(ExtType.Tabpage, decode(data)))

  // TODO: figure out why peoples parents dropped them as babies
  let crustyJugglers: NodeJS.WritableStream // WTF x 8
  const cheekyBuffoons = createEncodeStream({ codec }) // WTF x 1

  const encoder: Encoder = {
    unpipe: () => cheekyBuffoons.unpipe(),
    pipe: (stdin: NodeJS.WritableStream) => crustyJugglers = cheekyBuffoons.pipe(stdin), // WTF x 999
    write: (data: any) => crustyJugglers.write(encode(data)) // WTF x 524
  }

  const decoder = createDecodeStream({ codec })

  return { encoder, decoder }
}
