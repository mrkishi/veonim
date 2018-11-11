const finetti = () => {
  let buffer = new Float32Array()
  let width = 0

  const resize = (rows: number, cols: number) => {
    width = cols
    const oldBuffer = buffer
    buffer = new Float32Array(rows * cols * 4)
    const size = buffer.length

    // this approach of incrementing the col/row seems to be
    // about 2x faster than doing interger & mod quick maffs
    // just for ref:
    // col = (ix / 4) % width
    // row = ~~((ix / 4) / width)
    let col = 0
    let row = 0
    for (let ix = 0; ix < size; ix += 4) {
      const oldCol = oldBuffer[ix] || col
      const oldRow = oldBuffer[ix + 1] || row

      buffer[ix] = oldCol
      buffer[ix + 1] = oldRow
      buffer[ix + 2] = oldBuffer[ix + 2] || 0
      buffer[ix + 3] = oldBuffer[ix + 3] || 0

      col = oldCol
      row = oldRow

      col++
      if (col >= width) {
        row++
        col = 0
      }
    }
  }

  const getCell = (row: number, col: number) => {
    const ix = (col * 4) + width * row * 4
    return buffer.slice(ix, ix + 4)
  }

  const moveRegionUp = (lines: number, top: number, bottom: number) => {
    const startIndex = width * top * 4
    const offset = lines * width * 4
    const bottomIndex = width * bottom * 4 + (width * 4)
    const endIndex = bottomIndex - startIndex + offset

    for (let ix = startIndex; ix <= endIndex; ix += 4) {
      buffer[ix] = buffer[ix + offset]
      buffer[ix + 1] = buffer[ix + 1 + offset] - lines
      buffer[ix + 2] = buffer[ix + 2 + offset]
      buffer[ix + 3] = buffer[ix + 3 + offset]
      buffer[ix + 2 + offset] = 0
      buffer[ix + 3 + offset] = 0
    }
  }

  const moveRegionDown = (lines: number, top: number, bottom: number) => {
    const startIndex = width * top * 4
    const offset = lines * width * 4
    const bottomIndex = width * bottom * 4 + (width * 4)
    const endIndex = bottomIndex - offset

    for (let ix = endIndex; ix >= startIndex; ix -= 4) {
      buffer[ix + offset] = buffer[ix]
      buffer[ix + 1 + offset] = buffer[ix + 1] + lines
      buffer[ix + 2 + offset] = buffer[ix + 2]
      buffer[ix + 3 + offset] = buffer[ix + 3]
      buffer[ix + 2] = 0
      buffer[ix + 3] = 0
    }
  }

  return {
    resize,
    getCell,
    moveRegionUp,
    moveRegionDown,
    getBuffer: () => buffer,
  }
}

export default finetti
export type WebGLBuffer = ReturnType<typeof finetti>
