import { decode } from 'msgpack-lite'

// SPEC: https://github.com/msgpack/msgpack/blob/master/spec.md

enum MPKind {
  Val,
  Arr,
  Map,
  Str,
  Unknown,
}

interface TypKind {
  val?: any
  kind: MPKind
  length: number
  start: number
}

const typ = (raw: any, ix: number): TypKind => {
  const m = raw[ix]
  const def = { kind: MPKind.Val, start: ix, length: 1 }
  const unknown =  { kind: MPKind.Unknown, start: ix, length: 0 }
  if (m == 0xc0) return { ...def, val: null }
  if (m == 0xc2) return { ...def, val: false }
  if (m == 0xc3) return { ...def, val: true }

  // fixint
  if (m >= 0x00 && m <= 0x7f) return { ...def, val: m - 0x00 }

  // negative fixint
  if (m >= 0xe0 && m <= 0xff) return { ...def, val: (m - 0x100) }

  // uint8
  if (m == 0xcc) return {
    kind: MPKind.Val,
    val: raw[ix + 1],
    start: ix + 1,
    length: 1,
  }

  // int8
  if (m == 0xd0) {
    const val = raw[ix + 1]
    return {
      kind: MPKind.Val,
      val: [val & 0x80] ? val - 0x100 : val,
      start: ix + 1,
      length: 1,
    }
  }

  // uint16
  if (m == 0xcd) return {
    kind: MPKind.Val,
    val: (raw[ix + 1] << 8) + raw[ix + 2],
    start: ix + 1,
    length: 2,
  }

  // int16
  if (m === 0xd1) {
    const val = (raw[ix + 1] << 8) + raw[ix + 2]
    return {
      kind: MPKind.Val,
      val: (val & 0x8000) ? val - 0x10000 : val,
      start: ix + 1,
      length: 2,
    }
  }

  // uint32
  if (m == 0xce) return {
    kind: MPKind.Val,
    val: (raw[ix + 1] * 16777216) + (raw[ix + 2] << 16) + (raw[ix + 3] << 8) + raw[ix + 4],
    start: ix + 1,
    length: 4,
  }

  // int32
  if (m == 0xd2) return {
    kind: MPKind.Val,
    val: (raw[ix + 1] << 24) | (raw[ix + 2] << 16) | (raw[ix + 3] << 8) | raw[ix + 4],
    start: ix + 1,
    length: 4,
  }

  // uint64
  if (m == 0xcf) {
    console.warn('uint64 not supported')
    return unknown
  }

  // int64
  if (m == 0xd3) {
    console.warn('int64 not supported')
    return unknown
  }

  // fixarr
  if (m >= 0x90 && m <= 0x9f) return {
    kind: MPKind.Arr,
    length: m - 0x90,
    start: ix + 1,
  }

  // fixmap
  if (m >= 0x80 && m <= 0x8f) return {
    kind: MPKind.Map,
    length: m - 0x80,
    start: ix + 1,
  }

  // fixstr
  if (m >= 0xa0 && m <= 0xbf) return {
    kind: MPKind.Str,
    length: m - 0xa0,
    start: ix + 1,
  }

  // arr16
  if (m == 0xdc) return {
    kind: MPKind.Arr,
    length: raw[ix + 1] + raw[ix + 2],
    start: ix + 3,
  }

  // arr32
  if (m == 0xdd) return {
    kind: MPKind.Arr,
    length: raw[ix + 1] + raw[ix + 2] + raw[ix + 3] + raw[ix + 4],
    start: ix + 5,
  }

  // map16
  if (m == 0xde) return {
    kind: MPKind.Map,
    length: raw[ix + 1] + raw[ix + 2],
    start: 3,
  }

  // map32
  if (m == 0xdf) return {
    kind: MPKind.Map,
    length: raw[ix + 1] + raw[ix + 2] + raw[ix + 3] + raw[ix + 4],
    start: 5,
  }

  const byte = m.toString(16).padStart(2, '0')
  console.warn('not sure how to parse:', byte, def.start)
  return { kind: MPKind.Unknown, start: ix, length: 0 }
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

const parse = (raw: Buffer, { val, kind, start, length }: TypKind): ParseResult => {
  if (val) return [ start + length, val ]
  if (kind === MPKind.Arr) return toArr(raw, start, length)
  if (kind === MPKind.Str) return toStr(raw, start, length)
  if (kind === MPKind.Map) return toMap(raw, start, length)
  return [ start + length, undefined ]
}

export default (raw: any) => {
  const parsed = decode(raw)

  if (parsed[1] !== 'redraw') return

  console.log('---------------')

  const { kind, length, start } = typ(raw, 0)
  if (kind !== MPKind.Arr) return console.error('this message is not an array - not msgpack-rpc?', kind)
  const [ /*nextIx*/, res ] = toArr(raw, start, length)

  require('assert').strict.deepEqual(parsed, res)

  console.log('msgpack-lite:', parsed)
  console.log('my-little-ghetto:', res)
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
