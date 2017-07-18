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

export enum CursorShape {
  block,
  line,
  underline,
}

interface Api {
  resize(pixelHeight: number, pixelWidth: number): Api,
  setCursorColorAlpha(red: number, green: number, blue: number, alpha: number): Api,
  setCursorColor(color: string): Api,
  setCursorShape(type: CursorShape): Api,
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

export default ({ canvasId, cursorId }: { canvasId: string, cursorId: string }) => {
  const cursorEl = document.getElementById(cursorId) as HTMLElement
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement
  const ui = canvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D
  const ratio = window.devicePixelRatio

  const font: Font = { face: 'Courier New', size: 12, lineHeight: 1.5 }
  const actualSize: Cell = { width: 0, height: 0 }
  const cell: Cell = { width: 0, height: 0 }
  const cursor: Cursor = { row: 0, col: 0 }
  const grid: Grid = { rows: 0, cols: 0 }

  const sizeToGrid = (height: number, width: number): Grid => ({
    rows: Math.floor(height / cell.height),
    cols: Math.floor(width / cell.width)
  })

  const rowToPx = (row: number, scaled = false) => row * cell.height * (scaled ? ratio : 1)
  const colToPx = (col: number, scaled = false) => col * cell.width * (scaled ? ratio : 1)

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

    // setting canvas properties resets font. we need user to call setFont() first to
    // be able to calculate sizeToGrid() based on font size. but because font is reset
    // we will set the font again here
    ui.font = `${font.size}px ${font.face}`
    return api
  }

  api.setFont = ({ size = font.size, face = font.face, lineHeight = font.lineHeight }) => {
    ui.font = `${size}px ${face}`
    merge(font, { size, face, lineHeight })
    merge(cell, { width: ui.measureText('m').width, height: Math.ceil(size * lineHeight) })
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
    ui.fillText(text, colToPx(col), rowToPx(row) + rowToPx(1))
    return api
  }  

  api.getImageData = (col: number, row: number, width: number, height: number): ImageData => {
    return ui.getImageData(colToPx(col, true), rowToPx(row, true), colToPx(width, true), rowToPx(height, true))
  }

  api.putImageData = (data: ImageData, col: number, row: number) => {
    ui.putImageData(data, colToPx(col, true), rowToPx(row, true))
    return api
  }

  api.moveCursor = () => {
    merge(cursorEl.style, { top: `${rowToPx(cursor.row)}px`, left: `${colToPx(cursor.col)}px` })
    return api
  }

  api.setCursorShape = (type: CursorShape) => {
    if (type === CursorShape.block) merge(cursorEl.style, { height: `${rowToPx(1)}px`, width: `${colToPx(1)}px` })
    if (type === CursorShape.line) merge(cursorEl.style, { height: `${rowToPx(1)}px`, width: `${colToPx(0.2)}px` })
    if (type === CursorShape.underline) merge(cursorEl.style, { height: `${rowToPx(0.2)}px`, width: `${colToPx(1)}px` })
    return api
  }

  api.setCursorColor = (color: string) => {
    cursorEl.style.background = color
    return api
  }

  api.setCursorColorAlpha = (red: number, green: number, blue: number, alpha: number) => {
    cursorEl.style.background = `rgba(${red}, ${green}, ${blue}, ${alpha})`
    return api
  }

  return api
}
