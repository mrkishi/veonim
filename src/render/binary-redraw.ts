import { decode } from 'msgpack-lite'

// SPEC: https://github.com/msgpack/msgpack/blob/master/spec.md

enum MPKind {
  Val,
  Arr,
  Map,
  Str,
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
  if (m == 0xc0) return { ...def, val: null }
  if (m == 0xc2) return { ...def, val: false }
  if (m == 0xc3) return { ...def, val: true }

  // fixint
  if (m >= 0x00 && m <= 0x7f) return { ...def, val: m - 0x00 }

  // TODO: verify how we parse unsigned ints??
  // uint8
  if (m == 0xcc) return {
    kind: MPKind.Val,
    val: raw[ix + 1],
    start: ix + 1,
    length: 1,
  }

  // uint16
  if (m == 0xcd) return {
    kind: MPKind.Val,
    val: raw[ix + 1] + raw[ix + 2],
    start: ix + 1,
    length: 2,
  }

  // uint32
  if (m == 0xce) return {
    kind: MPKind.Val,
    val: raw[ix + 1] + raw[ix + 2] + raw[ix + 3] + raw[ix + 4],
    start: ix + 1,
    length: 4,
  }

  // uint64
  if (m == 0xcf) return {
    kind: MPKind.Val,
    val: raw[ix + 1] + raw[ix + 2] + raw[ix + 3] + raw[ix + 4]
       + raw[ix + 5] + raw[ix + 6] + raw[ix + 7] + raw[ix + 8],
    start: ix + 1,
    length: 8,
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

  // TODO: only for dev.
  return { ...def, kind: m.toString(16).padStart(2, '0') }
}

type ParseResult = [ number, any ]

const toMap = (raw: any, start: number, length: number): ParseResult => {
  console.log('toMap:', start, length)
  let ix = start
  const res = {}

  while (ix < length) {
    const keywut = typ(raw, ix)
    const valwut = typ(raw, ix + 1)
    console.log('OBJ! wut', wut)
    ix += 2
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

    // if (wut.val) {
    //   res.push(wut.val)
    //   ix++
    //   it++
    // }

    // else if (wut.kind === MPKind.Arr) {
    //   const [ nextIx, stuff ] = toArr(raw, wut.start, wut.length)
    //   ix = nextIx
    //   res.push(stuff)
    //   it++
    // }

    // else if (wut.kind === MPKind.Str) {
    //   const [ nextIx, stuff ] = toStr(raw, wut.start, wut.length)
    //   ix = nextIx
    //   res.push(stuff)
    //   it++
    // }

    // else if (wut.kind === MPKind.Map) {
    //   const [ nextIx, stuff ] = toMap(raw, wut.start, wut.length)
    //   ix = nextIx
    //   res.push(stuff)
    //   it++
    // }

    // else {
    //   console.warn('no idea how to handle element:', wut.kind)
    //   it++
    // }
  }

  return [ ix, res ]
}

const parse = (raw: Buffer, { val, kind, start, length }: TypKind): ParseResult => {
  if (val) return [ start + length, val ]
  if (kind === MPKind.Arr) return toArr(raw, start, length)
  if (kind === MPKind.Str) return toStr(raw, start, length)
  if (kind === MPKind.Map) return toMap(raw, start, length)

  console.warn('no idea how to parse element:', kind)
  return [ start + length, undefined ]
}

export default (data: any) => {
  const raw = data
  const parsed = decode(raw)
  const hex = Array.from(raw).map((buf: any) => buf.toString(16).padStart(2, '0'))
  let ix = 0



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
