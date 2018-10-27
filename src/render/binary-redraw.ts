// SPEC: https://github.com/msgpack/msgpack/blob/master/spec.md

const NOT_SUPPORTED = Symbol('NOT_SUPPORTED')
const FIXEXT1 = Symbol('FIXEXT1')
const FIXEXT2 = Symbol('FIXEXT2')
const FIXEXT4 = Symbol('FIXEXT4')
const FIXEXT8 = Symbol('FIXEXT8')
const FIXEXT16 = Symbol('FIXEXT16')
const EMPTY_OBJECT = Object.create(null)
const EMPTY_ARR: any[] = []
const EMPTY_STR = ''

let ix = 0

const superparse = (raw: Buffer) => {
  const m = raw[ix]

  // fixint
  if (m >= 0x00 && m <= 0x7f) return (ix++, m - 0x00)

  // fixarr
  else if (m >= 0x90 && m <= 0x9f) return (ix++, toArr(raw, m - 0x90))

  // uint8
  else if (m === 0xcc) return (ix+=2, raw[ix - 1])

  // fixstr
  else if (m >= 0xa0 && m <= 0xbf) return (ix++, toStr(raw, m - 0xa0))

  // str8
  else if (m === 0xd9) return (ix+=2, toStr(raw, raw[ix - 1]))

  // fixmap
  else if (m >= 0x80 && m <= 0x8f) return (ix++, toMap(raw, m - 0x80))

  // arr16
  else if (m === 0xdc) return (ix+=3, toArr(raw, raw[ix - 2] + raw[ix - 1]))

  // negative fixint
  else if (m >= 0xe0 && m <= 0xff) return (ix++, m - 0x100)

  else if (m === 0xc3) return (ix++, true)
  else if (m === 0xc2) return (ix++, false)
  else if (m === 0xc0) return (ix++, null)

  // uint16
  else if (m === 0xcd) return (ix+=3, (raw[ix - 2] << 8) + raw[ix - 1] )

  // str16
  else if (m === 0xda) return (ix+=3, toStr(raw, raw[ix - 2] + raw[ix - 1]))

  // map16
  else if (m === 0xde) return (ix+=3, toMap(raw, raw[ix - 2] + raw[ix - 1]))

  // int8
  else if (m === 0xd0) {
    const val = raw[ix + 1]
    ix += 2
    return (val & 0x80) ? val - 0x100 : val
  }

  // int16
  else if (m === 0xd1) {
    const val = (raw[ix + 1] << 8) + raw[ix + 2]
    ix += 3
    return (val & 0x8000) ? val - 0x10000 : val
  }

  // uint32
  else if (m === 0xce) {
    const val = (raw[ix + 1] * 16777216) + (raw[ix + 2] << 16) + (raw[ix + 3] << 8) + raw[ix + 4]
    ix += 5
    return val
  }

  // int32
  else if (m === 0xd2) {
    const val = (raw[ix + 1] << 24) | (raw[ix + 2] << 16) | (raw[ix + 3] << 8) | raw[ix + 4]
    ix += 5
    return val
  }

  // str32
  else if (m === 0xdb) {
    const val = toStr(raw, raw[ix + 1] + raw[ix + 2] + raw[ix + 3] + raw[ix + 4])
    ix += 5
    return val
  }

  // arr32
  else if (m === 0xdd) {
    const val = toArr(raw, raw[ix + 1] + raw[ix + 2] + raw[ix + 3] + raw[ix + 4])
    ix += 5
    return val
  }

  // map32
  else if (m === 0xdf) {
    const val = toMap(raw, raw[ix + 1] + raw[ix + 2] + raw[ix + 3] + raw[ix + 4])
    ix += 5
    return val
  }

  // fixext1
  else if (m === 0xd4) return (ix += 3, FIXEXT1)

  // fixext2
  else if (m === 0xd5) return (ix += 4, FIXEXT2)

  // fixext4
  else if (m === 0xd6) return (ix += 6, FIXEXT4)

  // fixext8
  else if (m === 0xd7) return (ix += 10, FIXEXT8)

  // fixext16
  else if (m === 0xd8) return (ix += 18, FIXEXT16)

  // uint64
  else if (m === 0xcf) (ix += 9, NOT_SUPPORTED)

  // int64
  else if (m === 0xd3) (ix += 9, NOT_SUPPORTED)

  else return (ix += 1, NOT_SUPPORTED)
}

const toMap = (raw: Buffer, length: number): any => {
  if (length === 0) return EMPTY_OBJECT

  const res = Object.create(null)

  for (let it = 0; it < length; it++) {
    const key = superparse(raw)
    const val = superparse(raw)
    res[key] = val
  }

  return res
}

const toStr = (raw: Buffer, length: number) => {
  ix += length
  if (length === 0) return EMPTY_STR
  // this is probably the most clever line in this module. deserializing
  // msgpack is fucking slow in v8. outside of JSON, allocating strings is
  // super slow and the bulk of our string allocs come from "grid_line" events
  // which contain 1 char strings.
  //
  // i've already setup the webgl renderer to take in ascii char codes and
  // translate them to texture coordinates, so creating strings for rendering
  // purposes is a waste of time
  //
  // the only downside to this approach is for any events that are not
  // "grid_line" - those events will need to deal with either strings or an
  // ascii char code (and maybe convert the char code to string).  we can do
  // this based on the nvim api protocol types, so anywhere where we expect
  // strings we can check for a number and convert it to str.
  if (length === 1) return raw[ix - 1]
  return raw.toString('utf8', ix - length, ix)
}

const toArr = (raw: Buffer, length: number): any[] => {
  if (length === 0) return EMPTY_ARR
  const res = new Array(length)
  for (let it = 0; it < length; it++) res[it] = superparse(raw)
  return res
}

// TODO: this is just what i currently see 
const windowWidth = 103
const windowHeight = 45

// TODO: what if we make the float32array to the max size of the window
// new Float32Array(win.rows * win.cols * 4)
// we can keep count of how many actual items were filled
// when we send to the gpu, we can use the actual filled count for gl_drawArrays
// TODO: is it really not possible to know the size of all the grid_line events?
// that way we don't have to create an intermediary array and instead set
// directly to typed array (assumes typed array setting is faster)
const grid_line = (stuff: any) => {
  let hlid = 0
  const size = stuff.length
  const res = new Float32Array(windowHeight * windowWidth * 4)
  let rx = 0

  // first item in the event arr is the event name.
  // we skip that because it's cool to do that
  for (let ix = 1; ix < size; ix++) {
    const [ ,row, col, charData ] = stuff[ix]
    let c = col
    const charDataSize = charData.length

    for (let cd = 0; cd < charDataSize; cd++) {
      const data = charData[cd]
      const char = data[0]
      const repeats = data[2] || 1
      hlid = data[1] || hlid

      for (let r = 0; r < repeats; r++) {
        res[rx] = char
        res[rx + 1] = c
        res[rx + 2] = row
        res[rx + 3] = hlid
        rx += 4
      }

      c++
    }
  }

  // console.log('res:', res)
  // console.log('count:', rx / 4)
}

type RedrawEvent = [string, any[]]
const redraw = (redrawEvents: RedrawEvent[]) => {
  const eventCount = redrawEvents.length

  for (let ix = 0; ix < eventCount; ix++) {
    const ev = redrawEvents[ix]
    if (ev[0] === 'grid_line') grid_line(ev)
  }
}

export default (raw: Buffer) => {
  ix = 0
  console.time('redraw')
  const res = superparse(raw)
  if (res[1] === 'redraw') redraw(res[2])
  console.timeEnd('redraw')
}
