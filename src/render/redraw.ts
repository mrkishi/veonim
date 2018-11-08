import { addHighlight, generateColorLookupAtlas, setDefaultColors } from '../render/highlight-attributes'
import { getCharIndex, getUpdatedFontAtlasMaybe } from '../render/font-texture-atlas'
import { onRedraw } from '../render/msgpack-decode'
import { WebGLRenderer } from '../render/webgl'
import * as windows from '../core/windows2'

// this default state should never be used. otherwise something went horribly wrong
let webgl: WebGLRenderer = {
  render: () => console.warn('trying to webgl wrender into a grid that has no window'),
} as any

let dummyData = new Float32Array()

const default_colors_set = (e: any) => {
  const [ fg, bg, sp ] = e[1]
  const defaultColorsChanged = setDefaultColors(fg, bg, sp)
  if (!defaultColorsChanged) return
  const colorAtlas = generateColorLookupAtlas()
  windows.getAll().forEach(win => win.webgl.updateColorAtlas(colorAtlas))
}

const hl_attr_define = (e: any) => {
  const size = e.length
  // first item in the event arr is the event name
  for (let ix = 1; ix < size; ix++) {
    const [ id, attr, info ] = e[ix]
    addHighlight(id, attr, info)
  }
  const colorAtlas = generateColorLookupAtlas()
  windows.getAll().forEach(win => win.webgl.updateColorAtlas(colorAtlas))
}

const win_position = (e: any) => {
  const count = e.length

  for (let ix = 1; ix < count; ix++) {
    const [ windowId, gridId, row, col, width, height ] = e[ix]
    windows.set(windowId, gridId, row, col, width, height)
  }
}

const grid_clear = ([ , [ gridId ] ]: any) => {
  if (gridId === 1) return
  if (windows.has(gridId)) windows.get(gridId).webgl.clear()
}

const grid_destroy = ([ , [ gridId ] ]: any) => {
  if (gridId === 1) return
  windows.remove(gridId)
}

const grid_resize = (e: any) => {
  const count = e.length

  for (let ix = 1; ix < count; ix++) {
    const [ gridId, width, height ] = e[ix]
    if (gridId === 1) continue
    // it seems we get grid_resize events before win_position. not sure why... but okay
    if (!windows.has(gridId)) windows.set(-1, gridId, 0, 0, width, height)
    windows.get(gridId).resizeWindow(width, height)
  }
}

const grid_cursor_goto = ([ , [ gridId, row, col ] ]: any) => {
  windows.setActiveGrid(gridId, row, col)
  // TODO: update cursor position
}

const grid_scroll = ([ , [ gridId, top, bottom, /*left*/, /*right*/, amount ] ]: any) => {
  if (gridId === 1) return
  // we make the assumption that left & right will always be
  // at the window edges (left == 0 && right == window.width)
  const win = windows.get(gridId)
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
  let charIndex = 0

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
      const win = windows.get(gridId)
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

    for (let cd = 0; cd < charDataSize; cd++) {
      const data = charData[cd]
      const char = data[0]
      const repeats = data[2] || 1
      hlid = data[1] || hlid

      if (typeof char === 'string') {
        const nextCD = charData[cd + 1]
        const doubleWidth = typeof nextCD[0] === 'string' && nextCD[0].codePointAt(0) === undefined
        charIndex = getCharIndex(char, doubleWidth ? 2 : 1)
      }

      else charIndex = char - 32

      for (let r = 0; r < repeats; r++) {
        buffer[rx] = col
        buffer[rx + 1] = row
        buffer[rx + 2] = hlid
        buffer[rx + 3] = charIndex
        rx += 4

        // TODO: could maybe deffer this to next frame?
        const bufix = (col * 4) + width * row * 4
        gridBuffer[bufix] = col
        gridBuffer[bufix + 1] = row
        gridBuffer[bufix + 2] = hlid
        gridBuffer[bufix + 3] = charIndex

        col++
      }
    }
  }

  const atlas = getUpdatedFontAtlasMaybe()
  if (atlas) windows.getAll().forEach(win => win.webgl.updateFontAtlas(atlas))
  console.time('webgl')
  webgl.render(rx)
  console.timeEnd('webgl')
}

onRedraw(redrawEvents => {
  console.time('redraw')
  const eventCount = redrawEvents.length
  let winUpdates = false

  for (let ix = 0; ix < eventCount; ix++) {
    const ev = redrawEvents[ix]

    // if statements ordered in wrender priority
    if (ev[0] === 'grid_line') grid_line(ev)
    else if (ev[0] === 'grid_scroll') grid_scroll(ev)
    else if (ev[0] === 'grid_cursor_goto') grid_cursor_goto(ev)
    else if (ev[0] === 'win_position') {
      win_position(ev)
      winUpdates = true
    }
    else if (ev[0] === 'grid_resize') grid_resize(ev)
    else if (ev[0] === 'grid_clear') grid_clear(ev)
    else if (ev[0] === 'grid_destroy') grid_destroy(ev)
    else if (ev[0] === 'hl_attr_define') hl_attr_define(ev)
    else if (ev[0] === 'default_colors_set') default_colors_set(ev)
  }

  requestAnimationFrame(() => {
    if (winUpdates) windows.render()
    windows.refresh()
  })
  console.timeEnd('redraw')
})
