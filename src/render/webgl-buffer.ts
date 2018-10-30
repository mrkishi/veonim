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

  // TODO: will we call this from the grid_line func or raw arr access?
  const setCell = (row: number, col: number, char: number, hlid: number) => {
    const ix = (col * 4) + width * row
    buffer[ix] = col
    buffer[ix + 1] = row
    buffer[ix + 2] = hlid
    buffer[ix + 3] = char
  }

  return {
    resize,
    getCell,
    setCell,
    getBuffer: () => buffer,
  }
}

export default finetti
export type WebGLBuffer = ReturnType<typeof finetti>
