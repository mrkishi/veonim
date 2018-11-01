const finetti = () => {
  let buffer = new Float32Array()
  let width = 0

  const resize = (rows: number, cols: number) => {
    width = cols
    buffer = new Float32Array(rows * cols * 4)
  }

  const getCell = (row: number, col: number) => {
    const ix = (col * 4) + width * row * 4
    return buffer.slice(ix, ix + 4)
  }

  // TODO: who gunna use this? decided that grid_line
  // will not call this
  const setCell = (row: number, col: number, char: number, hlid: number) => {
    const ix = (col * 4) + width * row * 4
    buffer[ix] = col
    buffer[ix + 1] = row
    buffer[ix + 2] = hlid
    buffer[ix + 3] = char
  }

  const moveRegionUp = (lines: number, top: number, bottom: number) => {
    const startIndex = width * top * 4
    const offset = lines * width * 4
    const bottomIndex = width * bottom * 4 + (width * 4)
    const endIndex = bottomIndex - startIndex + offset

    for (let ix = startIndex; ix < endIndex; ix += 4) {
      buffer[ix] = buffer[ix + offset]
      buffer[ix + 1] = buffer[ix + 1 + offset] - lines
      buffer[ix + 2] = buffer[ix + 2 + offset]
      buffer[ix + 3] = buffer[ix + 3 + offset]
      buffer[ix + 2 + offset] = 0
      buffer[ix + 3 + offset] = 32
    }
  }

  // TODO: this kinda works but not really
  const moveRegionDown = (lines: number, top: number, bottom: number) => {
    const startIndex = width * top * 4
    const offset = lines * width * 4
    const endIndex = startIndex + offset

    for (let ix = startIndex; ix < endIndex; ix += 4) {
      buffer[ix + offset] = buffer[ix]
      buffer[ix + 1 + offset] = buffer[ix + 1] + lines
      buffer[ix + 2 + offset] = buffer[ix + 2]
      buffer[ix + 3 + offset] = buffer[ix + 3]
      buffer[ix + 2] = 0
      buffer[ix + 3] = 32
    }
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
