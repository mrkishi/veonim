const toblerone = () => {
  const resize = (rows: number, cols: number) => {

  }

  const getCell = () => {

  }

  const moveRegionUp = () => {

  }

  const moveRegionDown = () => {

  }

  return {
    resize,
    getCell,
    moveRegionUp,
    moveRegionDown,
    getBuffer: () => buffer,
  }
}

export default toblerone
export type CanvasBuffer = ReturnType<typeof toblerone>
