// SPEC: https://github.com/msgpack/msgpack/blob/master/spec.md
import { decode } from 'msgpack-lite'

enum MPK {
  Val,
  Arr,
  Map,
  Str,
  Unknown,
}

// return type --> [MPK, start, length, value?]
const typ = (raw: Buffer, ix: number) => {
  const m = raw[ix]

  if (m == 0xc0) return [
    MPK.Val,
    ix,
    1,
    null,
  ]

  if (m == 0xc2) return [
    MPK.Val,
    ix,
    1,
    false,
  ]

  if (m == 0xc3) return [
    MPK.Val,
    ix,
    1,
    true,
  ]

  // fixint
  if (m >= 0x00 && m <= 0x7f) return [
    MPK.Val,
    ix,
    1,
    m - 0x00,
  ]

  // negative fixint
  if (m >= 0xe0 && m <= 0xff) return [
    MPK.Val,
    ix,
    1,
    m - 0x100,
  ]

  // uint8
  if (m == 0xcc) return [
    MPK.Val,
    ix + 1,
    1,
    raw[ix + 1],
  ]

  // int8
  if (m == 0xd0) {
    const val = raw[ix + 1]
    return [
      MPK.Val,
      ix + 1,
      1,
      (val & 0x80) ? val - 0x100 : val,
    ]
  }

  // uint16
  if (m == 0xcd) return [
    MPK.Val,
    ix + 1,
    2,
    (raw[ix + 1] << 8) + raw[ix + 2],
  ]

  // int16
  if (m === 0xd1) {
    const val = (raw[ix + 1] << 8) + raw[ix + 2]
    return [
      MPK.Val,
      ix + 1,
      2,
      (val & 0x8000) ? val - 0x10000 : val,
    ]
  }

  // uint32
  if (m == 0xce) return [
    MPK.Val,
    ix + 1,
    4,
    (raw[ix + 1] * 16777216) + (raw[ix + 2] << 16) + (raw[ix + 3] << 8) + raw[ix + 4],
  ]

  // int32
  if (m == 0xd2) return [
    MPK.Val,
    ix + 1,
    4,
    (raw[ix + 1] << 24) | (raw[ix + 2] << 16) | (raw[ix + 3] << 8) | raw[ix + 4],
  ]

  // fixarr
  if (m >= 0x90 && m <= 0x9f) return [
    MPK.Arr,
    ix + 1,
    m - 0x90,
  ]

  // fixmap
  if (m >= 0x80 && m <= 0x8f) return [
    MPK.Map,
    ix + 1,
    m - 0x80,
  ]

  // fixstr
  if (m >= 0xa0 && m <= 0xbf) return [
    MPK.Str,
    ix + 1,
    m - 0xa0,
  ]

  // arr16
  if (m == 0xdc) return [
    MPK.Arr,
    ix + 3,
    raw[ix + 1] + raw[ix + 2],
  ]

  // arr32
  if (m == 0xdd) return [
    MPK.Arr,
    ix + 5,
    raw[ix + 1] + raw[ix + 2] + raw[ix + 3] + raw[ix + 4],
  ]

  // map16
  if (m == 0xde) return [
    MPK.Map,
    ix + 3,
    raw[ix + 1] + raw[ix + 2],
  ]

  // map32
  if (m == 0xdf) return [
    MPK.Map,
    ix + 5,
    raw[ix + 1] + raw[ix + 2] + raw[ix + 3] + raw[ix + 4],
  ]

  // uint64
  if (m == 0xcf) {
    console.warn('uint64 not supported')
    return [MPK.Unknown, ix, 0]
  }

  // int64
  if (m == 0xd3) {
    console.warn('int64 not supported')
    return [MPK.Unknown, ix, 0]
  }

  const byte = m.toString(16).padStart(2, '0')
  console.warn('not sure how to parse:', byte, ix)
  return [MPK.Unknown, ix, 0]
}

type ParseResult = [ number, any ]

const toMap = (raw: any, start: number, length: number): ParseResult => {
  let it = 0
  let ix = start
  const res = {}

  while (it < length) {
    const keywut = typ(raw, ix)
    const [ valIx, key ] = parse(raw, keywut)
    const valwut = typ(raw, valIx)
    const [ nextIx, val ] = parse(raw, valwut)
    Reflect.set(res, key, val)
    ix = nextIx
    it++
  }

  return [ ix, res ]
}

const toStr = (raw: any, start: number, length: number): ParseResult => {
  const end = start + length
  const str = raw.toString('utf8', start, end)
  return [ end, str ]
}

const toArr = (raw: any, start: number, length: number): ParseResult => {
  let it = 0
  let ix = start
  const res = []

  while (it < length) {
    const wut = typ(raw, ix)
    const [ nextIx, stuff ] = parse(raw, wut)
    res.push(stuff)
    ix = nextIx
    it++
  }

  return [ ix, res ]
}

const parse = (raw: Buffer, [ kind, start, length, val ]: any[]): ParseResult => {
  if (kind === MPK.Val) return [ start + length, val ]
  if (kind === MPK.Arr) return toArr(raw, start, length)
  if (kind === MPK.Str) return toStr(raw, start, length)
  if (kind === MPK.Map) return toMap(raw, start, length)
  return [ start + length, undefined ]
}

export default (raw: any) => {
  console.log('---------------')
  console.time('msgpack')
  const parsed = decode(raw)
  console.timeEnd('msgpack')

  console.time('my-little-ghetto')
  const res = parse(raw, typ(raw, 0))
  console.timeEnd('my-little-ghetto')

  console.log('msgpack-lite:', parsed)
  console.log('my-little-ghetto:', res[1])

  try {
    require('assert').strict.deepEqual(parsed, res[1])
  } catch(e) {
    console.warn(e.message)
  }
  console.log('---------------')
}

/*
[
 2,
 redraw,
 [
   [grid_clear, [ ...args ]]
   [grid_line,
    [ args ]
    [ args ]
    [ args ]
    [ args ]
    [ args ]
   ]
 ]
]
 */
