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

// reusing this buffer array is much faster than recreating it.
// the question is how do we reconcile this with the grid memory?
// it seems inefficient to send the entire arraybuffer to the gpu,
// even if only char changed.
//
// perhaps we can use two arraybuffers -> one for what will be sent to the gpu
// and another for the actual grid representation.
//
// if we have to typearray buffers, one for temp and for the memgrid
// is it faster to update both, or is there a way we can use just one
// buf?
// // TODO: 
// like we could compute row/col -> buf index positions and then set
// accordingly. but is it faster to do those calcs or simply set two
// buffers
//
// and to solve the issue of copying the entire temp buffer to the gpu, perhaps
// we can use TypedArray.subarray() to slice only part of the temp buffer
//
// how much time does the .subarray cost?
//
// is subarray() faster or sending the entire temp buffer to the GPU faster?
// how do we benchmark the part that uploads the stuff to the GPU? .bufferData()
// 
// could use bufferSubData to update only part of the buffer on the GPU with a
// slice of the temp Float32Array (with subarray())
// - but do we need to do that? we will not need to reuse the buffer data for more
// than one draw.
//
const fb = new Float32Array(windowHeight * windowWidth * 4)
const grid_line = (stuff: any) => {
  let hlid = 0
  const size = stuff.length
  // TODO: what if we never create this typed array here. instead we replace
  // the grid memory buffer with a fixed float32array, and always just update
  // that one instance.
  //
  // then when it comes to clearing/scroll/split windows, we just update the grid
  // memory ONCE and send the entire thing to the GPU. the gpu is fast enough that
  // redrawing the entire scene is cool. what about uploading the entire thing to
  // the GPU?
  let rx = 0

  // first item in the event arr is the event name.
  // we skip that because it's cool to do that
  for (let ix = 1; ix < size; ix++) {
    // TODO: wat do with grid id?
    // when do we have 'grid_line' events for multiple grids?
    // like a horizontal split? nope. horizontal split just sends
    // win_resize events. i think it is up to us to redraw the
    // scene from the grid buffer
    const [ , row, col, charData ] = stuff[ix]
    let c = col
    const charDataSize = charData.length

    // TODO: if char is not a number, we need to use the old canvas
    // render strategy to render unicode chars
    //
    // TODO: are there any optimization route we can do if chars
    // are empty/need to clear a larger section?
    // depends on how we do the webgl wrender clear stuffffsss

    for (let cd = 0; cd < charDataSize; cd++) {
      const data = charData[cd]
      const char = data[0]
      const repeats = data[2] || 1
      hlid = data[1] || hlid

      for (let r = 0; r < repeats; r++) {
        fb[rx] = char
        fb[rx + 1] = c
        fb[rx + 2] = row
        fb[rx + 3] = hlid
        rx += 4
      }

      c++
    }
  }

  console.time('slice')
  // // TODO: 
  // this gets uploaded to the gpu.
  // not sure if it's faster to subarray and send a small piece of the temp
  // buf to the gpu, or send the entire tempbuf to the gpu. either way, it
  // still feels wrong to send the entire buf, especially for one char change
  const slice = fb.subarray(0, rx)
  console.timeEnd('slice')

  // console.log('fb:', res)
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
  const res = superparse(raw)
  console.time('redraw')
  if (res[1] === 'redraw') redraw(res[2])
  console.timeEnd('redraw')
}
