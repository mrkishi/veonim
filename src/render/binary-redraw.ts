import { decode } from 'msgpack-lite'

// SPEC: https://github.com/msgpack/msgpack/blob/master/spec.md

enum MPKind {
  Arr,
  Map,
  Str,
}

const typ = (raw: any, ix: number) => {
  const m = raw[ix]
  if (m == 0xc0) return { val: null }
  if (m == 0xc2) return { val: false }
  if (m == 0xc3) return { val: true }

  if (m >= 0x00 && m <= 0x7f) return {
    val: m - 0x00,
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

  return { kind: m.toString(16).padStart(2, '0'), length: 0 }
}

type ParseResult = [ number, any ]

const toMap = (raw: any, start: number, length: number): ParseResult => {
  console.log('toMap:', start, length)
  let ix = start
  const res = {}

  while (ix < length) {
    const wut = typ(raw, ix)
    console.log('OBJ! wut', wut)
    ix++
  }

  return [ ix, res ]
}

export default (data: any) => {
  const raw = data
  const parsed = decode(raw)
  const hex = Array.from(raw).map((buf: any) => buf.toString(16).padStart(2, '0'))
  let ix = 0

  const toStr = (raw: any, start: number, length: number): ParseResult => {
    const end = start + length
    const str = raw.toString('utf8', start, end)
    return [ end, str ]
  }

  const toArr = (raw: any, start: number, length: number): ParseResult => {
    let it = 0
    let ix = start
    const arr = []

    while (it < length) {
      const wut = typ(raw, ix)

      if (wut.val) {
        arr.push(wut.val)
        ix++
        it++
      }

      else if (wut.kind === MPKind.Arr) {
        const [ nextIx, stuff ] = toArr(raw, wut.start, wut.length)
        ix = nextIx
        arr.push(stuff)
        it++
      }

      else if (wut.kind === MPKind.Str) {
        const [ nextIx, stuff ] = toStr(raw, wut.start, wut.length)
        ix = nextIx
        arr.push(stuff)
        it++
      }

      else if (wut.kind === MPKind.Map) {
        const [ nextIx, stuff ] = toMap(raw, wut.start, wut.length)
        ix = nextIx
        arr.push(stuff)
        it++
      }

      else {
        console.warn('no idea how to handle element:', wut.kind)
        it++
      }
    }

    return [ ix, arr ]
  }

  if (parsed[1] !== 'redraw') return

  console.log('---------------')

  const { kind, length, start } = typ(raw, 0)
  console.log('init:', kind, start, length)
  let res
  if (kind === MPKind.Arr) res = toArr(raw, start, length)

  console.log('parsed:', parsed)
  console.log('res:', res[1])
  console.log('hex:', hex)
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
