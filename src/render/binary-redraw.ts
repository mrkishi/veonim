import { encode, decode } from 'msgpack-lite'

// SPEC: https://github.com/msgpack/msgpack/blob/master/spec.md

const typ = (m: any) => {
  if (m >= 0x90 && m <= 0x9f) return { kind: 'fixarr', length: m - 0x90 }
  if (m >= 0x80 && m <= 0x8f) return { kind: 'fixmap', length: m - 0x80 }
  if (m >= 0x00 && m <= 0x7f) return { kind: '+fixint', val: m - 0x00 }
  if (m >= 0xa0 && m <= 0xbf) return { kind: 'fixstr', length: m - 0xa0 }
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
