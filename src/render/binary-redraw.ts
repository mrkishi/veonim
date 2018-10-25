// SPEC: https://github.com/msgpack/msgpack/blob/master/spec.md
import { encode, decode } from 'msgpack-lite'

enum MPK {
  Val,
  Arr,
  Map,
  Str,
  Unknown,
}

// TODO: use typed arrays maybe?

// return type --> [MPK, start, length, value?]
const typ = (raw: Buffer, ix: number): any[] => {
  const m = raw[ix]

  if (m === 0xc0) return [
    MPK.Val,
    ix,
    1,
    null,
  ]

  if (m === 0xc2) return [
    MPK.Val,
    ix,
    1,
    false,
  ]

  if (m === 0xc3) return [
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
  if (m === 0xcc) return [
    MPK.Val,
    ix + 1,
    1,
    raw[ix + 1],
  ]

  // int8
  if (m === 0xd0) {
    const val = raw[ix + 1]
    return [
      MPK.Val,
      ix + 1,
      1,
      (val & 0x80) ? val - 0x100 : val,
    ]
  }

  // uint16
  if (m === 0xcd) return [
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
  if (m === 0xce) return [
    MPK.Val,
    ix + 1,
    4,
    (raw[ix + 1] * 16777216) + (raw[ix + 2] << 16) + (raw[ix + 3] << 8) + raw[ix + 4],
  ]

  // int32
  if (m === 0xd2) return [
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
  if (m === 0xdc) return [
    MPK.Arr,
    ix + 3,
    raw[ix + 1] + raw[ix + 2],
  ]

  // arr32
  if (m === 0xdd) return [
    MPK.Arr,
    ix + 5,
    raw[ix + 1] + raw[ix + 2] + raw[ix + 3] + raw[ix + 4],
  ]

  // map16
  if (m === 0xde) return [
    MPK.Map,
    ix + 3,
    raw[ix + 1] + raw[ix + 2],
  ]

  // map32
  if (m === 0xdf) return [
    MPK.Map,
    ix + 5,
    raw[ix + 1] + raw[ix + 2] + raw[ix + 3] + raw[ix + 4],
  ]

  // str8
  if (m === 0xd9) return [
    MPK.Str,
    ix + 2,
    raw[ix + 1],
  ]

  // str16
  if (m === 0xda) return [
    MPK.Str,
    ix + 3,
    raw[ix + 1] + raw[ix + 2],
  ]

  // str32
  if (m === 0xdb) return [
    MPK.Str,
    ix + 5,
    raw[ix + 1] + raw[ix + 2] + raw[ix + 3] + raw[ix + 4],
  ]

  // uint64
  if (m === 0xcf) {
    console.warn('uint64 not supported')
    return [MPK.Unknown, ix, 0]
  }

  // int64
  if (m === 0xd3) {
    console.warn('int64 not supported')
    return [MPK.Unknown, ix, 0]
  }

  const byte = m.toString(16).padStart(2, '0')
  console.warn('not sure how to parse:', byte, ix)
  return [MPK.Unknown, ix, 0]
}

const superparse = (raw: Buffer, ix = 0): ParseResult => {
  const m = raw[ix]

  if (m === 0xc0) return [ix + 1, null]
  else if (m === 0xc2) return [ix + 1, false]
  else if (m === 0xc3) return [ix + 1, true]

  // uint8
  else if (m === 0xcc) return [ix + 2, raw[ix + 1]]

  // int8
  else if (m === 0xd0) {
    const val = raw[ix + 1]
    return [ix + 2, (val & 0x80) ? val - 0x100 : val]
  }

  // uint16
  else if (m === 0xcd) return [ix + 3, (raw[ix + 1] << 8) + raw[ix + 2]]

  // int16
  else if (m === 0xd1) {
    const val = (raw[ix + 1] << 8) + raw[ix + 2]
    return [ix + 3, (val & 0x8000) ? val - 0x10000 : val]
  }

  // uint32
  else if (m === 0xce) return [
    ix + 5,
    (raw[ix + 1] * 16777216) + (raw[ix + 2] << 16) + (raw[ix + 3] << 8) + raw[ix + 4],
  ]

  // int32
  else if (m === 0xd2) return [
    ix + 5,
    (raw[ix + 1] << 24) | (raw[ix + 2] << 16) | (raw[ix + 3] << 8) | raw[ix + 4],
  ]

  // arr16
  else if (m === 0xdc) return toArr(raw, ix + 3, raw[ix + 1] + raw[ix + 2])

  // arr32
  else if (m === 0xdd) return toArr(raw, ix + 5, raw[ix + 1] + raw[ix + 2] + raw[ix + 3] + raw[ix + 4])

  // map16
  else if (m === 0xde) return toMap(raw, ix + 3, raw[ix + 1] + raw[ix + 2])

  // map32
  else if (m === 0xdf) return toMap(raw, ix + 5, raw[ix + 1] + raw[ix + 2] + raw[ix + 3] + raw[ix + 4])

  // str8
  else if (m === 0xd9) return toStr(raw, ix + 2, raw[ix + 1])

  // str16
  else if (m === 0xda) return toStr(raw, ix + 3, raw[ix + 1] + raw[ix + 2])

  // str32
  else if (m === 0xdb) return toStr(raw, ix + 5, raw[ix + 1] + raw[ix + 2] + raw[ix + 3] + raw[ix + 4])

  // fixarr
  else if (m >= 0x90 && m <= 0x9f) return toArr(raw, ix + 1, m - 0x90)

  // fixmap
  else if (m >= 0x80 && m <= 0x8f) return toMap(raw, ix + 1, m - 0x80)

  // fixstr
  else if (m >= 0xa0 && m <= 0xbf) return toStr(raw, ix + 1, m - 0xa0)

  // fixint
  else if (m >= 0x00 && m <= 0x7f) return [ix + 1, m - 0x00]

  // negative fixint
  else if (m >= 0xe0 && m <= 0xff) return [ix + 1, m - 0x100]

  // fixext1
  else if (m === 0xd4) return [ix + 3, FIXEXT1]

  // fixext2
  else if (m === 0xd5) return [ix + 4, FIXEXT2]

  // fixext4
  else if (m === 0xd6) return [ix + 6, FIXEXT4]

  // fixext8
  else if (m === 0xd7) return [ix + 10, FIXEXT8]

  // fixext16
  else if (m === 0xd8) return [ix + 18, FIXEXT16]

  // uint64
  else if (m === 0xcf) {
    console.warn('uint64 not supported')
    return [ix + 9, undefined]
  }

  // int64
  else if (m === 0xd3) {
    console.warn('int64 not supported')
    return [ix + 9, undefined]
  }

  const byte = m.toString(16).padStart(2, '0')
  console.warn('not sure how to parse:', byte, ix)
  return [ix + 1, undefined]
}

type ParseResult = [ number, any ]

const emptyObject = Object.create(null)
const emptyArr: any[] = []
const emptyStr = ''

const toMap = (raw: any, start: number, length: number): ParseResult => {
  if (length === 0) return [start, emptyObject]

  let it = 0
  let ix = start
  const res = Object.create(null)

  while (it < length) {
    const [ valIx, key ] = superparse(raw, ix)
    const [ nextIx, val ] = superparse(raw, valIx)
    res[key] = val
    ix = nextIx
    it++
  }

  return [ ix, res ]
}

const toStr = (raw: any, start: number, length: number): ParseResult => {
  if (length === 0) return [start, emptyStr]

  const end = start + length
  const str = raw.toString('utf8', start, end)
  return [ end, str ]
}

const toArr = (raw: any, start: number, length: number): ParseResult => {
  if (length === 0) return [start, emptyArr]
  const isGridLine = raw.slice(start, start + GRID_LINE_SIZE).equals(GRID_LINE)
  if (isGridLine) return goGridLine(raw, start, length)

  let it = 0
  let ix = start
  const res = new Array(length)

  while (it < length) {
    const [ nextIx, stuff ] = superparse(raw, ix)
    res[it] = stuff
    ix = nextIx
    it++
  }

  return [ ix, res ]
}

// const parse = (raw: Buffer, [ kind, start, length, val ]: any[]): ParseResult => {
//   if (kind === MPK.Val) return [ start + length, val ]
//   if (kind === MPK.Arr) return toArr(raw, start, length)
//   if (kind === MPK.Str) return toStr(raw, start, length)
//   if (kind === MPK.Map) return toMap(raw, start, length)
//   return [ start + length, undefined ]
// }

const GRID_LINE = encode('grid_line')
const GRID_LINE_SIZE = GRID_LINE.byteLength
console.log('GRID_LINE', GRID_LINE, GRID_LINE_SIZE)

const FIXEXT1 = Symbol('FIXEXT1')
const FIXEXT2 = Symbol('FIXEXT2')
const FIXEXT4 = Symbol('FIXEXT4')
const FIXEXT8 = Symbol('FIXEXT8')
const FIXEXT16 = Symbol('FIXEXT16')

const goGridLine = (raw: Buffer, start: number, length: number): ParseResult => {
  console.log('GRID_LINE LOL', start, length)
  return [start + length, undefined]
  // TODO: we need to return the end index to continue the decode chain...
  // TODO: need to return end index..........fuck
}

// TODO: TACOS
// first try to parse the top level of the msgpack rpc arr
// [2, redraw, []]
// if we match the above, jump into the args arr
// extract out the first item (a string), but not parse it
// use the binary part of the string to do a lookup into a map
// of matching binary strings -> funcs
// if func found, call it.
// func needs to somehow parse thru the the binary slice and
// return back the end index for the next segment

const hex = (zz: Buffer) => zz.reduce((res, m) => {
  res.push(m.toString(16).padStart(2, '0'))
  return res
}, [] as string[])

const b_grid_clear = Buffer.from('grid_clear')
const b_option_set = Buffer.from('option_set')

const doGridClear = (buf: Buffer, ix: number) => {
  console.warn('grid_clear()')
  return ix
}

const doOptionSet = (buf: Buffer, ix: number) => {
  console.warn('option_set()')
  return ix
}

export default (raw: any) => {
  console.log('---------------')
  console.time('msgpack')
  const parsed = decode(raw)
  console.timeEnd('msgpack')

  console.time('my-little-ghetto')
  const res = superparse(raw)
  console.timeEnd('my-little-ghetto')

  console.time('hardcode')
  // hardcode is faster than buffer.equals(buf)
  const isMatch = raw[0] === 0x93
    && raw[1] === 0x02
    && raw[2] === 0xa6
    && raw[3] === 0x72
    && raw[4] === 0x65
    && raw[5] === 0x64
    && raw[6] === 0x72
    && raw[7] === 0x61
    && raw[8] === 0x77
  console.timeEnd('hardcode')

  // const ass = Buffer.from([0x93, 0x02, 0xa6, 0x72, 0x65, 0x64, 0x72, 0x61, 0x77])
  // console.time('dynamic')
  // const mm = raw.slice(0, 9).equals(ass)
  // console.timeEnd('dynamic')

  if (isMatch) {
    const [ , s1, l1 ] = typ(raw, 9)
    const [ k2, s2, l2 ] = typ(raw, s1)
    if (k2 === MPK.Arr) console.log('good, first item is an arr')
    const [ k3, s3, l3 ] = typ(raw, s2)
    if (k3 === MPK.Str) console.log('we have a string of length:', l3)
    const rawstr = raw.slice(s3, s3 + l3)
    if (rawstr.equals(b_grid_clear)) doGridClear(raw, s3 + l3)
    if (rawstr.equals(b_option_set)) doOptionSet(raw, s3 + l3)
  }

  console.log('msgpack-lite:', parsed)
  console.log('my-little-ghetto:', res[1])

  // // try {
  // //   require('assert').strict.deepEqual(parsed, res[1])
  // // } catch(e) {
  //   // console.warn(e.message)
  // // }
  // console.log('---------------')
}
