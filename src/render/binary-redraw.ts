import { decode } from 'msgpack-lite'

// SPEC: https://github.com/msgpack/msgpack/blob/master/spec.md

const typ = (raw: any, ix: number) => {
  const m = raw[ix]
  if (m == 0xc0) return { val: null }
  if (m == 0xc2) return { val: false }
  if (m == 0xc3) return { val: true }

  if (m >= 0x00 && m <= 0x7f) return {
    kind: '+fixint',
    val: m - 0x00,
  }

  // fixarr
  if (m >= 0x90 && m <= 0x9f) return {
    kind: 'arr',
    length: m - 0x90,
    start: ix + 1,
  }

  // fixmap
  if (m >= 0x80 && m <= 0x8f) return {
    kind: 'map',
    length: m - 0x80,
    start: ix + 1,
  }

  // fixstr
  if (m >= 0xa0 && m <= 0xbf) return {
    kind: 'str',
    length: m - 0xa0,
    start: ix + 1,
  }

  // arr16
  if (m == 0xdc) return {
    kind: 'arr',
    length: raw[ix + 1] + raw[ix + 2],
    start: ix + 3,
  }

  return { kind: m.toString(16).padStart(2, '0'), length: 0 }
}


export default (data: any) => {
  const raw = data
  const parsed = decode(raw)
  const hex = Array.from(raw).map((buf: any) => buf.toString(16).padStart(2, '0'))
  let ix = 0

  const toStr = (raw: any, start: number, length: number) => {
    const end = start + length
    const str = raw.toString('utf8', start, end)
    return [ end, str ]
  }

  const toArr = (raw: any, start: number, length: number): [ number, any[] ] => {
    let it = 0
    let ix = start
    const arr = []

    while (it < length) {
      const wut = typ(raw, ix)
      console.log('wut', wut)

      if (wut.val) {
        arr.push(wut.val)
        ix++
        it++
      }

      else if (wut.kind === 'arr') {
        const [ nextIx, stuff ] = toArr(raw, wut.start, wut.length)
        ix = nextIx
        arr.push(stuff)
        it++
      }

      else if (wut.kind === 'str') {
        const [ nextIx, stuff ] = toStr(raw, wut.start, wut.length)
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
  if (kind === 'arr') res = toArr(raw, start, length)

  console.log('parsed:', parsed)
  // TODO: where does the [23, [2, 'redraw', []]] come from?
  console.log('res:', res)
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
