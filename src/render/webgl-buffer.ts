const finetti = () => {
  let buffer = new Float32Array()
  let width = 0

  const resize = (rows: number, cols: number) => {
    width = cols
    buffer = new Float32Array(rows * cols * 2)
  }

  const getCell = (row: number, col: number) => {
    const ix = (col * 2) + width * row
    const char = buffer[ix]
    const hlid = buffer[ix + 1]
    return [ char, hlid ]
  }

  // TODO: will we call this from the grid_line func or raw arr access?
  const setCell = (row: number, col: number, char: number, hlid: number) => {
    const ix = (col * 2) + width * row
    buffer[ix] = char
    buffer[ix + 1] = hlid
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
