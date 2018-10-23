import { encode, decode } from 'msgpack-lite'

// TODO: capture an incoming redraw message coming from
// neovim. will have msgpack-rpc stuff to that we need to parse

const typ = (m: any) => {
  if (m >= 0x90 && m <= 0x9f) return { kind: 'fixarr', length: m - 0x90 }
}

export default (data: any) => {
  const raw = data
  const parsed = decode(raw)
  const hex = Array.from(raw).map(buf => buf.toString(16).padStart(2, '0'))

  if (parsed[1] !== 'redraw') return

  const kind = typ(raw[0])
  console.log('kind', kind)

  console.log('raw:', raw)
  console.log('hex:', hex)
  console.log('parsed:', parsed)
}
