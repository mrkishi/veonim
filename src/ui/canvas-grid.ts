const merge = Object.assign

interface Font {
  face: string,
  size: number,
  lineHeight: number
}

interface FontParam {
  face?: string,
  size?: number,
  lineHeight?: number
}

interface Cell {
  width: number,
  height: number
}

interface Grid {
  rows: number,
  cols: number
}

export default class CanvasGrid {
  readonly canvas: HTMLCanvasElement
  readonly ui: CanvasRenderingContext2D
  readonly ratio: number

  private actualSize: Cell
  private grid: Grid
  private cell: Cell
  private font: Font

  constructor (id: string) {
    this.canvas = document.getElementById(id) as HTMLCanvasElement
    this.ui = this.canvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D
    this.ratio = window.devicePixelRatio

    this.actualSize = { width: 0, height: 0 }
    this.grid = { rows: 0, cols: 0 }
    this.cell = { width: 0, height: 0 }
    this.font = { face: 'Roboto Mono', size: 12, lineHeight: 1.5 }
  }

  private sizeToGrid (height: number, width: number) {
    this.grid.rows = Math.floor(height / this.cell.height)
    this.grid.cols = Math.floor(width / this.cell.width)
  }

  private rowToPx (row: number) {
    return (row * this.cell.height) + this.cell.height
  }

  private colToPx (col: number) {
    return col * this.cell.width
  }

  get cols () {
    return this.grid.cols
  }

  get rows () {
    return this.grid.rows
  }

  public resize (pixelHeight: number, pixelWidth: number) {
    merge(this.actualSize, { width: pixelWidth, height: pixelHeight })

    this.canvas.height = pixelHeight * 2
    this.canvas.width = pixelWidth * 2
    this.canvas.style.height = `${pixelHeight}px`
    this.canvas.style.width = `${pixelWidth}px`

    this.ui.scale(this.ratio, this.ratio)
    this.sizeToGrid(pixelHeight, pixelWidth)

    return this
  }

  public setFont ({
    size = this.font.size,
    face = this.font.face,
    lineHeight = this.font.lineHeight
  }: FontParam) {
    merge(this.font, { size, face, lineHeight })
    this.ui.font = `${size}px ${face}`

    const { width } = this.ui.measureText('m')
    const height = Math.ceil(size * lineHeight)
    merge(this.cell, { width, height })

    return this
  }

  public setFillStyle (color: string) {
    this.ui.fillStyle = color
    return this
  }

  public clear () {
    this.ui.fillRect(0, 0, this.actualSize.width, this.actualSize.height)
    return this
  }

  public setTextBaseLine (mode: string) {
    this.ui.textBaseline = mode
    return this
  }

  public fillRect (col: number, row: number, width: number, height: number) {
    this.ui.fillRect(
      this.colToPx(col),
      this.rowToPx(row),
      this.colToPx(width),
      this.rowToPx(height)
    )

    return this
  }

  public fillText (text: string, col: number, row: number) {
    this.ui.fillText(text, this.colToPx(col), this.rowToPx(row))
    return this
  }  

  public getImageData (col: number, row: number, width: number, height: number): ImageData {
    return this.ui.getImageData(
      this.colToPx(col),
      this.rowToPx(row),
      this.colToPx(width),
      this.rowToPx(height)
    )
  }

  public putImageData (data: ImageData, col: number, row: number) {
    this.ui.putImageData(data, col, row)
    return this
  }
}
