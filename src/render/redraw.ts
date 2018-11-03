import { addHighlight, generateColorLookupAtlas, setDefaultColors } from '../render/highlight-attributes'
import { getWindow, getAllWindows } from '../core/windows2'
import { onRedraw } from '../render/msgpack-decode'
import { WebGLWrenderer } from '../render/webgl'

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


// this default state should never be used. otherwise something went horribly wrong
let webgl: WebGLWrenderer = {
  render: () => console.warn('trying to wrender into a grid that has no window'),
} as any

let dummyData = new Float32Array()

const default_colors_set = (e: any) => {
  const [ fg, bg, sp ] = e[1]
  const defaultColorsChanged = setDefaultColors(fg, bg, sp)
  if (!defaultColorsChanged) return
  const colorAtlas = generateColorLookupAtlas()
  getAllWindows().forEach(win => win.webgl.updateColorAtlas(colorAtlas))
}

const hl_attr_define = (e: any) => {
  const size = e.length
  // first item in the event arr is the even name
  for (let ix = 1; ix < size; ix++) {
    const [ id, attr, info ] = e[ix]
    addHighlight(id, attr, info)
  }
  const colorAtlas = generateColorLookupAtlas()
  getAllWindows().forEach(win => win.webgl.updateColorAtlas(colorAtlas))
}

const grid_clear = (e: any) => {
  const [ gridId ] = e[1]
  if (gridId === 1) return
  getWindow(gridId).webgl.clear()
}

const grid_scroll = (e: any) => {
  const [ gridId, top, bottom, /*left*/, /*right*/, amount ] = e[1]
  if (gridId === 1) return
  // we make the assumption that left & right will always be
  // at the window edges (left == 0 && right == window.width)
  const win = getWindow(gridId)
  win.webgl.clear()
  amount > 0
    ? win.webgl.moveRegionUp(amount, top, bottom)
    : win.webgl.moveRegionDown(-amount, top, bottom)
}

const grid_line = (e: any) => {
  let hlid = 0
  const size = e.length
  // TODO: this render buffer index is gonna be wrong if we switch window grids
  // while doing the render buffer sets
  let rx = 0
  let activeGrid = 0
  let buffer = dummyData
  let gridBuffer = dummyData
  let width = 1
  let col = 0

  // first item in the event arr is the event name.
  // we skip that because it's cool to do that
  for (let ix = 1; ix < size; ix++) {
    // TODO: wat do with grid id?
    // when do we have 'grid_line' events for multiple grids?
    // like a horizontal split? nope. horizontal split just sends
    // win_resize events. i think it is up to us to redraw the
    // scene from the grid buffer
    const [ gridId, row, startCol, charData ] = e[ix]
    if (gridId === 1) continue

    if (gridId !== activeGrid) {
      // TODO: what if we have multiple active webgls... how to keep track of them
      if (activeGrid !== 0) console.warn('grid_line: switch grid more than once! lolwut', gridId)
      const win = getWindow(gridId)
      webgl = win.webgl
      // TODO: getting width here is kinda expensive. improve.
      width = win.getWindowInfo().width
      buffer = webgl.getBuffer()
      gridBuffer = webgl.getGridBuffer()
      activeGrid = gridId
    }
    hlid = 0
    col = startCol
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
        buffer[rx] = col
        buffer[rx + 1] = row
        buffer[rx + 2] = hlid
        buffer[rx + 3] = char
        rx += 4

        // TODO: could maybe deffer this to next frame?
        const bufix = (col * 4) + width * row * 4
        gridBuffer[bufix] = col
        gridBuffer[bufix + 1] = row
        gridBuffer[bufix + 2] = hlid
        gridBuffer[bufix + 3] = char

        col++
      }
    }
  }

  console.time('webgl')
  webgl.render(rx)
  console.timeEnd('webgl')
}

onRedraw(redrawEvents => {
  console.time('redraw')
  const eventCount = redrawEvents.length

  for (let ix = 0; ix < eventCount; ix++) {
    const ev = redrawEvents[ix]
    if (ev[0] === 'grid_line') grid_line(ev)
    else if (ev[0] === 'grid_scroll') grid_scroll(ev)
    else if (ev[0] === 'grid_clear') grid_clear(ev)
    else if (ev[0] === 'hl_attr_define') hl_attr_define(ev)
    else if (ev[0] === 'default_colors_set') default_colors_set(ev)
  }
  console.timeEnd('redraw')
})
