const toblerone = () => {
  const buffer: any[] = []
  let width = 0

  const resize = (rows: number, cols: number) => {
    width = cols
    const size = rows * cols * 5

    // this approach of incrementing the col/row seems to be
    // about 2x faster than doing interger & mod quick maffs
    // just for ref:
    // col = (ix / 4) % width
    // row = ~~((ix / 4) / width)
    let col = 0
    let row = 0
    for (let ix = 0; ix < size; ix += 4) {
      buffer[ix] = col
      buffer[ix + 1] = row
      col++
      if (col >= width) {
        row++
        col = 0
      }
    }
  }

  const getCell = (col: number, row: number) => {
    const ix = (col * 5) + width * row * 5
    return buffer.slice(ix, ix + 5)
  }

  const setCell = (col: number, row: number, hlid: number, char: string, repeat = 1) => {
    const ix = (col * 5) + width * row * 5
    buffer[ix] = col
    buffer[ix + 1] = row
    buffer[ix + 2] = hlid
    buffer[ix + 3] = char
    buffer[ix + 4] = repeat
  }

  const moveRegionUp = () => {

  }

  const moveRegionDown = () => {

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

export default toblerone
export type CanvasBuffer = ReturnType<typeof toblerone>
