import { encode, decode, createEncodeStream, createDecodeStream, createCodec } from 'msgpack-lite'

export interface Encoder {
  unpipe(): NodeJS.WritableStream,
  pipe(stdin: NodeJS.WritableStream): NodeJS.WritableStream,
  write(data: any): boolean,
}

// TODO: actually implement this lol
const wtf = class WHATTHEFUCK {
  public val: any
  constructor (data: any) {
    this.val = data
  }
}

export default () => {
  const codec = createCodec()

  codec.addExtPacker(0, wtf, (data: any) => encode(data))
  codec.addExtPacker(1, wtf, (data: any) => encode(data))
  codec.addExtPacker(2, wtf, (data: any) => encode(data))

  codec.addExtUnpacker(0, data => new wtf(decode(data)))
  codec.addExtUnpacker(1, data => new wtf(decode(data)))
  codec.addExtUnpacker(2, data => new wtf(decode(data)))

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
