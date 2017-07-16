const merge = Object.assign

interface Font {
  face: string,
  size: number,
  lineHeight: number
}

interface Cell {
  width: number,
  height: number
}

interface Grid {
  rows: number,
  cols: number
}

interface Cursor {
  row: number,
  col: number
}

interface Api {
  resize(pixelHeight: number, pixelWidth: number): Api,
  changeCurosrColorAlpha(red: number, green: number, blue: number, alpha: number): Api,
  changeCursorColor(color: string): Api,
  changeCursorShape(type: string): Api,
  moveCursor(): Api,
  putImageData(data: ImageData, col: number, row: number): Api,
  getImageData(col: number, row: number, width: number, height: number): ImageData,
  fillText(text: string, col: number, row: number): Api,
  fillRect(col: number, row: number, width: number, height: number): Api,
  setTextBaseline(mode: string): Api,
  clear(): Api,
  setColor(color: string): Api,
  setFont(params: { size?: number, face?: string, lineHeight?: number }): Api,
  readonly cols: number,
  readonly rows: number,
  cursor: Cursor
}

export default (canvasId: string, cursorId: string) => {
  const cursorEl = document.getElementById(cursorId) as HTMLElement
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement
  const ui = canvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D
  const ratio = window.devicePixelRatio

  const actualSize: Cell = { width: 0, height: 0 }
  const grid: Grid = { rows: 0, cols: 0 }
  const cell: Cell = { width: 0, height: 0 }
  const font: Font = { face: 'Roboto Mono', size: 12, lineHeight: 1.5 }
  const cursor: Cursor = { row: 0, col: 0 }

  const sizeToGrid = (height: number, width: number): Grid => ({
    rows: Math.floor(height / cell.height),
    cols: Math.floor(width / cell.width)
  })

  const rowToPx = (row: number) => {
    return (row * cell.height) + cell.height
  }

  const colToPx = (col: number) => {
    return col * cell.width
  }

  const api = {
    cursor,
    get cols () { return grid.cols },
    get rows () { return grid.rows }
  } as Api

  api.resize = (pixelHeight: number, pixelWidth: number) => {
    merge(actualSize, { width: pixelWidth, height: pixelHeight })

    canvas.height = pixelHeight * 2
    canvas.width = pixelWidth * 2
    canvas.style.height = `${pixelHeight}px`
    canvas.style.width = `${pixelWidth}px`

    ui.scale(ratio, ratio)
    merge(grid, sizeToGrid(pixelHeight, pixelWidth))

    return api
  }

  api.setFont = ({ size = font.size, face = font.face, lineHeight = font.lineHeight }) => {
    merge(font, { size, face, lineHeight })
    ui.font = `${size}px ${face}`

    const { width } = ui.measureText('m')
    const height = Math.ceil(size * lineHeight)
    merge(cell, { width, height })

    return api
  }

  api.setColor = (color: string) => {
    ui.fillStyle = color
    return api
  }

  api.clear = () => {
    ui.fillRect(0, 0, actualSize.width, actualSize.height)
    return api
  }

  api.setTextBaseline = (mode: string) => {
    ui.textBaseline = mode
    return api
  }

  api.fillRect = (col: number, row: number, width: number, height: number) => {
    ui.fillRect(colToPx(col), rowToPx(row), colToPx(width), rowToPx(height))
    return api
  }

  api.fillText = (text: string, col: number, row: number) => {
    ui.fillText(text, colToPx(col), rowToPx(row))
    return api
  }  

  api.getImageData = (col: number, row: number, width: number, height: number): ImageData => {
    return ui.getImageData(colToPx(col), rowToPx(row), colToPx(width), rowToPx(height))
  }

  api.putImageData = (data: ImageData, col: number, row: number) => {
    ui.putImageData(data, col, row)
    return api
  }

  api.moveCursor = () => {
    merge(cursorEl.style, { top: `${rowToPx(cursor.row)}px`, left: `${colToPx(cursor.col)}px` })
    console.log(`move cursor to row: ${cursor.row} col ${cursor.col}`)
    return api
  }

  api.changeCursorShape = (type: string) => {
    if (type === 'block') merge(cursorEl.style, { height: `${rowToPx(1)}px`, width: `${rowToPx(1)}px` })
    if (type === 'line') merge(cursorEl.style, { height: `${rowToPx(1)}px`, width: `${rowToPx(0.2)}px` })
    if (type === 'underline') merge(cursorEl.style, { height: `${rowToPx(0.2)}px`, width: `${rowToPx(1)}px` })
    return api
  }

  api.changeCursorColor = (color: string) => {
    cursorEl.style.background = color
    return api
  }

  api.changeCurosrColorAlpha = (red: number, green: number, blue: number, alpha: number) => {
    cursorEl.style.background = `rgba(${red}, ${green}, ${blue}, ${alpha})`
    return api
  }

  return api
}
