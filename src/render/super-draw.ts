import { addHighlight, generateColorLookupAtlas, setDefaultColors } from '../render/highlight-attributes'
import { getWindow, getAllWindows } from '../core/windows2'
import { onRedraw } from '../render/super-msgpack'
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

// [ event_name, [ fg, bg, sp ] ]
const defaultColorsSet = (e: any) => {
  const colors = e[1]
  const defaultColorsChanged = setDefaultColors(colors[0], colors[1], colors[2])
  if (!defaultColorsChanged) return
  const colorAtlas = generateColorLookupAtlas()
  getAllWindows().forEach(win => win.webgl.updateColorAtlas(colorAtlas))
}

const hlAttrDefine = (e: any) => {
  const size = e.length
  // first item in the event arr is the even name
  for (let ix = 1; ix < size; ix++) {
    const [ id, attr, info ] = e[ix]
    addHighlight(id, attr, info)
  }
  const colorAtlas = generateColorLookupAtlas()
  getAllWindows().forEach(win => win.webgl.updateColorAtlas(colorAtlas))
}

const grid_line = (e: any) => {
  let hlid = 0
  const size = e.length
  // TODO: this render buffer index is gonna be wrong if we switch window grids
  // while doing the render buffer sets
  let fgx = 0
  let bgx = 0
  let activeGrid = 0
  let fgd = dummyData
  let bgd = dummyData
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
    const [ gridId, row, col, charData ] = e[ix]
    if (gridId !== activeGrid) {
      // console.log('grid id changed: (before -> after)', activeGrid, gridId)
      // TODO: what if we have multiple active webgls... how to keep track of them
      webgl = getWindow(gridId).webgl
      fgd = webgl.getForegroundBuffer()
      bgd = webgl.getBackgroundBuffer()
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
        fgd[fgx] = char
        fgd[fgx + 1] = c
        fgd[fgx + 2] = row
        fgd[fgx + 3] = hlid
        fgx += 4

        bgd[bgx] = c
        bgd[bgx + 1] = row
        bgd[bgx + 2] = hlid

        bgx += 3
      }

      c++
    }
  }

  console.time('webgl')
  webgl.render(fgx, bgx)
  console.timeEnd('webgl')
}

onRedraw(redrawEvents => {
  console.time('redraw')
  const eventCount = redrawEvents.length

  for (let ix = 0; ix < eventCount; ix++) {
    const ev = redrawEvents[ix]
    if (ev[0] === 'grid_line') grid_line(ev)
    else if (ev[0] === 'hl_attr_define') hlAttrDefine(ev)
    else if (ev[0] === 'default_colors_set') defaultColorsSet(ev)
  }
  console.timeEnd('redraw')
})
