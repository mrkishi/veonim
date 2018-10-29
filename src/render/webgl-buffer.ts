const finetti = () => {
  let buffer = new Float32Array()
  let width = 0
  // TODO: need to include row + col in the array
  // since we are gonna send to this to the GPU
  // also this whole thing needs to be duplicated for
  // the background/foreground webgls
  //
  // is there no way to share the same buffer data between
  // webgl contexts?

  const resize = (rows: number, cols: number) => {
    width = cols
    buffer = new Float32Array(rows * cols * 4)
  }

  const getCell = (row: number, col: number) => {
    const ix = (col * 4) + width * row
    const char = buffer[ix]
    const hlid = buffer[ix + 3]
    return [ char, hlid ]
  }

  // TODO: will we call this from the grid_line func or raw arr access?
  const setCell = (row: number, col: number, char: number, hlid: number) => {
    const ix = (col * 4) + width * row
    buffer[ix] = char
    buffer[ix + 3] = hlid
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
