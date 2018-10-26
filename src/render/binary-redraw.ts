// SPEC: https://github.com/msgpack/msgpack/blob/master/spec.md
import { decode } from 'msgpack-lite'

enum MPK { Val, Arr, Map, Str, Unknown }

const typ = (raw: Buffer, ix: number): any[] /* kind, start, length */ => {
  const m = raw[ix]

  if (m === 0xc0) return [MPK.Val, ix + 1, 1]
  if (m === 0xc2) return [MPK.Val, ix + 1, 1]
  if (m === 0xc3) return [MPK.Val, ix + 1, 1]

  // fixint
  if (m >= 0x00 && m <= 0x7f) return [MPK.Val, ix + 1, 1]

  // negative fixint
  if (m >= 0xe0 && m <= 0xff) return [MPK.Val, ix + 1, 1]

  // uint8
  if (m === 0xcc) return [MPK.Val, ix + 2, 1]

  // int8
  if (m === 0xd0) [MPK.Val, ix + 2, 1]

  // uint16
  if (m === 0xcd) return [MPK.Val, ix + 3, 2]

  // int16
  if (m === 0xd1) [MPK.Val, ix + 3, 2]

  // uint32
  if (m === 0xce) return [MPK.Val, ix + 5, 4]

  // int32
  if (m === 0xd2) return [MPK.Val, ix + 5, 4]

  // fixarr
  if (m >= 0x90 && m <= 0x9f) return [MPK.Arr, ix + 1, m - 0x90]

  // fixmap
  if (m >= 0x80 && m <= 0x8f) return [MPK.Map, ix + 1, m - 0x80]

  // fixstr
  if (m >= 0xa0 && m <= 0xbf) return [MPK.Str, ix + 1, m - 0xa0]

  // arr16
  if (m === 0xdc) return [MPK.Arr, ix + 3, raw[ix + 1] + raw[ix + 2]]

  // arr32
  if (m === 0xdd) return [MPK.Arr, ix + 5, raw[ix + 1] + raw[ix + 2] + raw[ix + 3] + raw[ix + 4]]

  // map16
  if (m === 0xde) return [MPK.Map, ix + 3, raw[ix + 1] + raw[ix + 2]]

  // map32
  if (m === 0xdf) return [MPK.Map, ix + 5, raw[ix + 1] + raw[ix + 2] + raw[ix + 3] + raw[ix + 4]]

  // str8
  if (m === 0xd9) return [MPK.Str, ix + 2, raw[ix + 1]]

  // str16
  if (m === 0xda) return [MPK.Str, ix + 3, raw[ix + 1] + raw[ix + 2]]

  // str32
  if (m === 0xdb) return [MPK.Str, ix + 5, raw[ix + 1] + raw[ix + 2] + raw[ix + 3] + raw[ix + 4]]

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

const numparse = (raw: Buffer, ix: number): ParseResult => {
  const m = raw[ix]
  // fixint
  if (m >= 0x00 && m <= 0x7f) return [ix + 1, m - 0x00]
  // uint8
  if (m === 0xcc) return [ix + 2, raw[ix + 1]]
  // uint16
  if (m === 0xcd) return [ix + 3, (raw[ix + 1] << 8) + raw[ix + 2]]
  console.warn('failed to parse number', m)
  return [ix, undefined]
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

const FIXEXT1 = Symbol('FIXEXT1')
const FIXEXT2 = Symbol('FIXEXT2')
const FIXEXT4 = Symbol('FIXEXT4')
const FIXEXT8 = Symbol('FIXEXT8')
const FIXEXT16 = Symbol('FIXEXT16')

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

// const hex = (zz: Buffer) => zz.reduce((res, m) => {
//   res.push(m.toString(16).padStart(2, '0'))
//   return res
// }, [] as string[])

const b_grid_line = Buffer.from('grid_line')

// ['grid_line', [gridId, x, y, charData], [gridId, x, y, charData]]
const doGridLine = (buf: Buffer, index: number) => {
  // array
  const [ , ix1, length ] = typ(buf, index)
  // string - event name "grid_line"
  const [ , strix, strlen ] = typ(buf, ix1)

  let ix = strix + strlen

  for (let it = 1; it < length; it++) {
    // grid_line events should always be arr of 4 items
    // [ gridId, x, y, [chars] ]

    // array
    const [ , s1, l1 ] = typ(buf, ix)
    console.log('l1', l1)

    const [ s2, gridId ] = numparse(buf, s1)
    const [ s3, x ] = numparse(buf, s2)
    const [ s4, y ] = numparse(buf, s3)
    console.log('gridid, x, y', gridId, x, y)

    const [ k3, lineCharsStart, lineCharsLength ] = typ(buf, s4)
    ix = lineCharsStart
    console.log('k3', k3)
    console.log('lineCharsLength', lineCharsLength)

    // charData --> [ charString, hlid, repeat = 1 ] x lines
    for (let lt = 0; lt < lineCharsLength; lt++) {
      // const [ , charDataStart, charDataLength ] = typ(buf, ix)
      // ix = charDataStart

      // for (let ct = 0; ct < charDataLength; ct++) {
      //   const [ nextCharIx, charData ] = superparse(buf, ix)
      //   console.log('charData', charData)
      //   ix = nextCharIx

      // }
      const [ nextCharIx, charArr ] = superparse(buf, ix)
      // console.log('charArr:', charArr)
      ix = nextCharIx
    }

    // const [ nextIx, out ] = superparse(buf, lineCharsStart)
    // console.log('out:', out, gridId, x, y)
    // console.log('nextIndex', nextIx, ix)
    // ix = nextIx
  }

  return ix
}

// this is just a tad bit faster than buf.slice().equals()
const bufEquals = (compareBuf: Buffer) => (buf: Buffer, start: number, end: number) => {
  let allEqual = true
  for (let ix = start; ix <= end; ix++) allEqual = buf[ix] === compareBuf[ix]
  return allEqual
}

// buf version of [2, 'redraw'
// will attempt to check if current buffer starts with
// the "redraw" msgpack rpc notification event
const redrawMatchBuf = Buffer.from([0x93, 0x02, 0xa6, 0x72, 0x65, 0x64, 0x72, 0x61, 0x77])
const isRedrawBuf = bufEquals(redrawMatchBuf)

export default (raw: any) => {
  console.log('---------------')
  console.time('msgpack')
  const parsed = decode(raw)
  console.timeEnd('msgpack')

  console.time('my-little-ghetto')
  const res = superparse(raw)
  console.timeEnd('my-little-ghetto')

  console.log('msgpack-lite:', parsed)
  console.log('my-little-ghetto:', res[1])

  // structure looks like
  // [2, 'redraw', [
  //   ['grid_clear', [], []],
  //   ['grid_line', [], [], [], [], [], []],
  // ]]
  console.time('binary-redraw')
  const aaa = []
  if (isRedrawBuf(raw, 0, 8)) {
    // this is the redraw event list. we need this
    // to get the startIndex of where the first item
    // starts (after arr type + length)
    const [,s1, length] = typ(raw, 9)
    let ix = s1

    for (let it = 0; it < length; it++) {
      // the event arr element - need this to determine
      // start position of first string (the event name)
      const [,s2] = typ(raw, ix)

      // get first str in arr -> this is the event name
      const [,s3,l3] = typ(raw, s2)
      const rawstr = raw.slice(s3, s3 + l3)

      // we need to backup and send the buffer from the point where
      // the array starts. otherwise we don't know how many items
      // we need to parse out of the array

      // sorted in order of importance
      if (rawstr.equals(b_grid_line)) {
        ix = doGridLine(raw, ix)
      }

      // else if (rawstr.equals(b_grid_clear)) doGridClear(raw, s3 + l3)

      else {
        const [nextIx, eventItems] = superparse(raw, ix)
        aaa.push(eventItems)
        // console.log('do something with:', eventItems)
        ix = nextIx
      }
    }
    console.log('------->', aaa)
  }
  console.timeEnd('binary-redraw')


  // // try {
  // //   require('assert').strict.deepEqual(parsed, res[1])
  // // } catch(e) {
  //   // console.warn(e.message)
  // // }
  // console.log('---------------')
}
