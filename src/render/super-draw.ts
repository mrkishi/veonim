import { onRedraw } from '../render/super-msgpack'
import { getWindow } from '../core/windows2'

// TODO: this is just what i currently see 
// const windowWidth = 103
// const windowHeight = 45

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
// const fb = new Float32Array(windowHeight * windowWidth * 4)

// idk, maybe it's faster to have this dummy placeholder buffer
// instead of checking null/undefined on every pass. the reason
// is that we should never ever run into a situation where the
// proper render buffer was not retrieved (so this placeholder
// should never get touch me and then just push me...)
const placeholderRenderBuffer = new Float32Array(200 * 200 * 4)

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




  // TODO: this render buffer index is gonna be wrong if we switch window grids
  // while doing the render buffer sets
  let rx = 0
  let activeGrid = 0
  let renderBuffer = placeholderRenderBuffer

  // first item in the event arr is the event name.
  // we skip that because it's cool to do that
  for (let ix = 1; ix < size; ix++) {
    // TODO: wat do with grid id?
    // when do we have 'grid_line' events for multiple grids?
    // like a horizontal split? nope. horizontal split just sends
    // win_resize events. i think it is up to us to redraw the
    // scene from the grid buffer
    const [ gridId , row, col, charData ] = stuff[ix]
    if (gridId !== activeGrid) {
      // console.log('grid id changed: (before -> after)', activeGrid, gridId)
      renderBuffer = getWindow(gridId).renderBuffer
      activeGrid = gridId
    }
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
        renderBuffer[rx] = char
        renderBuffer[rx + 1] = c
        renderBuffer[rx + 2] = row
        renderBuffer[rx + 3] = hlid
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
  const slice = renderBuffer.subarray(0, rx)
  console.log('slice', slice)
  console.timeEnd('slice')

  // TODO: WRENDER WEBGL!!!
}

onRedraw(redrawEvents => {
  console.log('redraw pls', redrawEvents)
  const eventCount = redrawEvents.length

  for (let ix = 0; ix < eventCount; ix++) {
    const ev = redrawEvents[ix]
    if (ev[0] === 'grid_line') grid_line(ev)
  }
})
