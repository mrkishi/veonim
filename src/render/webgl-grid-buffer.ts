const finetti = () => {
  let buffer = new Float32Array()
  let width = 0

  const resize = (rows: number, cols: number) => {
    width = cols
    buffer = new Float32Array(rows * cols * 4)
  }

  const getCell = (row: number, col: number) => {
    const ix = (col * 4) + width * row
    return buffer.slice(ix, ix + 3)
  }

  // TODO: who gunna use this? decided that grid_line
  // will not call this
  const setCell = (row: number, col: number, char: number, hlid: number) => {
    const ix = (col * 4) + width * row
    buffer[ix] = col
    buffer[ix + 1] = row
    buffer[ix + 2] = hlid
    buffer[ix + 3] = char
  }

  const moveRegionUp = (lines: number, top: number, bottom: number) => {
    console.log('mrUP', lines, top, bottom)
    const startIndex = width * top
    const endIndex = width * bottom
    const offset = lines * width * 4

    for (let ix = startIndex; ix < endIndex; ix++) {
      buffer[ix - offset] = buffer[ix]
      buffer[ix + 1 - offset] = buffer[ix + 1]
      buffer[ix + 2 - offset] = buffer[ix + 2]
      buffer[ix + 3 - offset] = buffer[ix + 3]
    }

    return [ startIndex - offset, endIndex - offset ]
  }

  const moveRegionDown = (lines: number, top: number, bottom: number) => {
    console.log('mrDOWN', lines, top, bottom)
    const startIndex = width * top
    const endIndex = width * bottom
    const offset = lines * width * 4

    for (let ix = startIndex; ix < endIndex; ix++) {
      buffer[ix + offset] = buffer[ix]
      buffer[ix + 1 + offset] = buffer[ix + 1]
      buffer[ix + 2 + offset] = buffer[ix + 2]
      buffer[ix + 3 + offset] = buffer[ix + 3]
    }

    return [ startIndex + offset, endIndex + offset ]
  }

  return {
    resize,
    getCell,
    setCell,
    moveRegionUp,
    moveRegionDown,
    getBuffer: () => buffer,
  }
}

export default finetti
export type WebGLBuffer = ReturnType<typeof finetti>
