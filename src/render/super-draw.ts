import { onRedraw } from '../render/super-msgpack'
import { WebGLWrenderer } from '../render/webgl'
import { getWindow } from '../core/windows2'

// TODO: yeha so i tihnkk we need to have two buffers.
// - one for render
// - one for grid representation
//
// the reason for this is that when we update the grid representation
// the updates might be non sequential in the buffer. this means
// we can no longer send a piece of the buffer to the gpu.
//
// also i wonder if we can push the grid representation updates
// to the next frame (after wrender). not important for screen update


// these should never be used. if they are used something went horribly wrong
let renderBuffer = new Float32Array(400 * 400 * 4)
let webgl: WebGLWrenderer = {
  render: () => console.warn('trying to wrender into a grid that has no window')
} as any

const grid_line = (stuff: any) => {
  let hlid = 0
  const size = stuff.length
  // TODO: this render buffer index is gonna be wrong if we switch window grids
  // while doing the render buffer sets
  let rx = 0
  let activeGrid = 0
  // let activeWebgl: WebGLWrenderer
  // let renderBuffer = placeholderRenderBuffer

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
      // TODO: what if we have multiple active webgls... how to keep track of them
      const w = getWindow(gridId)
      renderBuffer = w.renderBuffer
      webgl = w.webgl
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

  console.time('webgl')
  // // TODO: 
  // this gets uploaded to the gpu.
  // not sure if it's faster to subarray and send a small piece of the temp
  // buf to the gpu, or send the entire tempbuf to the gpu. either way, it
  // still feels wrong to send the entire buf, especially for one char change
  const slice = renderBuffer.subarray(0, rx)
  webgl.render(slice, new Float32Array())
  console.timeEnd('webgl')
}

onRedraw(redrawEvents => {
  console.log('redraw pls', redrawEvents)
  const eventCount = redrawEvents.length

  for (let ix = 0; ix < eventCount; ix++) {
    const ev = redrawEvents[ix]
    if (ev[0] === 'grid_line') grid_line(ev)
  }
})
