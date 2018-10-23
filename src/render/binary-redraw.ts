import { decode } from 'msgpack-lite'

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
  const hex = Array.from(raw).map((buf: any) => buf.toString(16).padStart(2, '0'))
  let ix = 0

  const toStr = (raw: any, start: number, length: number) => {
    console.log('toStr:', start, length)
    const end = start + length
    const str = raw.toString('utf8', start, end)
    return [ end, str ]
  }

  const toArr = (raw: any, start: number, length: number) => {
    console.log('toArr:', start, length)
    let it = 0
    let ix = start
    const arr = []

    while (it < length) {
      const wut = typ(raw[ix])
      console.log('wut', wut)

      if (wut.kind === '+fixint') {
        arr.push(wut.val)
        ix++
        it++
      }

      else if (wut.kind === 'fixarr') {
        const [ nextIx, stuff ] = toArr(raw, ix, wut.length)
        ix = nextIx
        arr.push(stuff)
        it++
      }

      else if (wut.kind === 'fixstr') {
        const [ nextIx, stuff ] = toStr(raw, ix, wut.length)
        ix = nextIx
        arr.push(stuff)
        it++
      }

      else it++
    }

    return [ ix, arr ]
  }

  if (parsed[1] !== 'redraw') return

  console.log('---------------')

  const { kind, length, val } = typ(raw[0])
  let res
  if (kind === 'fixarr') res = toArr(raw, 1, length)
  console.log('res:', res)

  // while (ix < 5) {
  //   const kind = typ(raw[ix])


  //   ix++
  // }

  console.log('kind', kind)

  console.log('raw:', raw)
  console.log('hex:', hex)
  console.log('parsed:', parsed)
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
