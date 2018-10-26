// SPEC: https://github.com/msgpack/msgpack/blob/master/spec.md
// import { decode } from 'msgpack-lite'

const NOT_SUPPORTED = Symbol('NOT_SUPPORTED')
const FIXEXT1 = Symbol('FIXEXT1')
const FIXEXT2 = Symbol('FIXEXT2')
const FIXEXT4 = Symbol('FIXEXT4')
const FIXEXT8 = Symbol('FIXEXT8')
const FIXEXT16 = Symbol('FIXEXT16')

const superparse = (raw: Buffer, ix = 0): ParseResult => {
  const m = raw[ix]

  // fixint
  if (m >= 0x00 && m <= 0x7f) return [ix + 1, m - 0x00]

  // fixarr
  else if (m >= 0x90 && m <= 0x9f) return toArr(raw, ix + 1, m - 0x90)

  // uint8
  else if (m === 0xcc) return [ix + 2, raw[ix + 1]]

  // fixstr
  else if (m >= 0xa0 && m <= 0xbf) return toStr(raw, ix + 1, m - 0xa0)

  // str8
  else if (m === 0xd9) return toStr(raw, ix + 2, raw[ix + 1])

  // fixmap
  else if (m >= 0x80 && m <= 0x8f) return toMap(raw, ix + 1, m - 0x80)

  // arr16
  else if (m === 0xdc) return toArr(raw, ix + 3, raw[ix + 1] + raw[ix + 2])

  // negative fixint
  else if (m >= 0xe0 && m <= 0xff) return [ix + 1, m - 0x100]

  else if (m === 0xc3) return [ix + 1, true]
  else if (m === 0xc2) return [ix + 1, false]
  else if (m === 0xc0) return [ix + 1, null]

  // uint16
  else if (m === 0xcd) return [ix + 3, (raw[ix + 1] << 8) + raw[ix + 2]]

  // str16
  else if (m === 0xda) return toStr(raw, ix + 3, raw[ix + 1] + raw[ix + 2])

  // map16
  else if (m === 0xde) return toMap(raw, ix + 3, raw[ix + 1] + raw[ix + 2])

  // int8
  else if (m === 0xd0) {
    const val = raw[ix + 1]
    return [ix + 2, (val & 0x80) ? val - 0x100 : val]
  }

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

  // str32
  else if (m === 0xdb) return toStr(raw, ix + 5, raw[ix + 1] + raw[ix + 2] + raw[ix + 3] + raw[ix + 4])

  // arr32
  else if (m === 0xdd) return toArr(raw, ix + 5, raw[ix + 1] + raw[ix + 2] + raw[ix + 3] + raw[ix + 4])

  // map32
  else if (m === 0xdf) return toMap(raw, ix + 5, raw[ix + 1] + raw[ix + 2] + raw[ix + 3] + raw[ix + 4])

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
  else if (m === 0xcf) [ix + 9, NOT_SUPPORTED]

  // int64
  else if (m === 0xd3) [ix + 9, NOT_SUPPORTED]

  else return [ix + 1, NOT_SUPPORTED]
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
  if (length === 1) return [start + 1, raw[start]]

  const end = start + length
  const str = raw.toString('utf8', start, end)

  return [ end, str ]
}

const toArr = (raw: any, start: number, length: number): ParseResult => {
  if (length === 0) return [start, emptyArr]

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

// const hex = (zz: Buffer) => zz.reduce((res, m) => {
//   res.push(m.toString(16).padStart(2, '0'))
//   return res
// }, [] as string[])

// TODO: when creating strings, what if the length is 1 we just return charcode int?
// TODO: DO WE NEED THESE INDEX ARRAYS???? OR CAN WE JUST RETURN THE VAL!
// TODO: WHAT IS CAUSING THE GC PAUSES???
// TODO: how can we skip allocating strings?
// TODO: if we figure out a way to skip creating strings, can we use a typedarray?
// TODO: maybe we can give hints for "toArr". like, yo, we are inside grid_line
// this next array you gotta create is a typedarray. then skip string alloc, just do buf

// skip parse of 1 char strings has potential!

const doTheNeedful = (raw: Buffer) => superparse(raw)

export default (raw: any) => {
  console.time('custom')
  const [ , res ] = doTheNeedful(raw)
  console.timeEnd('custom')
  console.log('res', res)
}
