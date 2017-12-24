import * as canvasContainer from '../core/canvas-container'
import { merge } from '../support/utils'

export enum CursorShape {
  block,
  line,
  underline
}

export interface TransferRegion {
  width: number,
  height: number,
  source: {
    row: number,
    col: number,
  },
  destination: {
    row: number,
    col: number,
  },
}

export interface Specs {
  row: number,
  col: number,
  height: number,
  width: number,
}

export interface CanvasWindow {
  px: {
    row: {
      height(row: number, scaled?: boolean): number,
      y(rows: number, scaled?: boolean): number,
    },
    col: {
      width(col: number, scaled?: boolean): number,
      x(cols: number, scaled?: boolean): number,
    }
  },
  getSpecs(): Specs,
  setSpecs(row: number, col: number, height: number, width: number): CanvasWindow,
  rowToY(row: number): number,
  colToX(col: number): number,
  resize(rows: number, columns: number): CanvasWindow,
  moveRegion(region: TransferRegion): CanvasWindow,
  fillText(text: string, col: number, row: number): CanvasWindow,
  fillRect(col: number, row: number, width: number, height: number): CanvasWindow,
  setTextBaseline(mode: string): CanvasWindow,
  clear(): CanvasWindow,
  setColor(color: string): CanvasWindow,
  isActive(): boolean,
  deactivate(): void,
}

export const createWindow = (container: HTMLElement) => {
  const canvas = document.createElement('canvas')
  const ui = canvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D
  const specs = { row: 0, col: 0, height: 0, width: 0 }
  const api = {} as CanvasWindow
  let active = false

  ui.imageSmoothingEnabled = false
  ui.font = `${canvasContainer.font.size}px ${canvasContainer.font.face}`
  container.appendChild(canvas)
  canvasContainer.on('font', ({ size, face }) => ui.font = `${size}px ${face}`)

  api.px = {
    row: {
      height: (row, scaled = false) =>
        Math.floor(row * canvasContainer.cell.height * (scaled ? window.devicePixelRatio : 1)),
      y: (row, scaled = false) =>
        api.px.row.height(row - specs.row, scaled) + (scaled ? window.devicePixelRatio : 1),
    },
    col: {
      width: (col, scaled = false) =>
        Math.floor(col * canvasContainer.cell.width * (scaled ? window.devicePixelRatio : 1)),
      x: (col, scaled = false) =>
        api.px.col.width(col - specs.col, scaled) + (scaled ? window.devicePixelRatio : 1),
    }
  }

  api.getSpecs = () => specs
  api.setSpecs = (row, col, height, width) => (merge(specs, { row, col, height, width }), api)
  // TODO: make these absolute and internalize api.px?
  api.rowToY = row => api.px.row.y(row)
  api.colToX = col => api.px.col.x(col)

  api.deactivate = () => active = false
  api.isActive = () => active
  api.resize = (rows, columns) => {
    active = true
    console.log('REDO O BOI LOL')
    console.log('SPECS:', specs)
    const height = api.px.row.height(rows)
    const width = api.px.col.width(columns)

    canvas.height = height * window.devicePixelRatio
    canvas.width = width * window.devicePixelRatio
    canvas.style.height = `${height}px`
    canvas.style.width = `${width}px`

    ui.scale(window.devicePixelRatio, window.devicePixelRatio)

    // setting canvas properties resets font. need to reset it here
    ui.font = `${canvasContainer.font.size}px ${canvasContainer.font.face}`
    return api
  }

  api.setColor = color => (ui.fillStyle = color, api)
  api.clear = () => (ui.fillRect(0, 0, canvas.width, canvas.height), api)
  api.setTextBaseline = mode => (ui.textBaseline = mode, api)
  api.fillText = (m, c, r) => {
    ui.fillText(m, api.px.col.x(c), api.px.row.y(r) + canvasContainer.cell.padding)
    return api
  }

  api.fillRect = (c, r, w, h) => {
    ui.fillRect(api.px.col.x(c), api.px.row.y(r), api.px.col.width(w), api.px.row.height(h))
    return api
  }

  api.moveRegion = ({ width, height, source, destination }) => {
    const srcX = api.px.col.x(source.col, true)
    const srcY = api.px.row.y(source.row, true)
    const srcWidth = api.px.col.width(width, true)
    const srcHeight = api.px.row.height(height, true)

    const destX = api.px.col.x(destination.col)
    const destY = api.px.row.y(destination.row)
    const destWidth = api.px.col.width(width)
    const destHeight = api.px.row.height(height)

    ui.drawImage(ui.canvas, srcX, srcY, srcWidth, srcHeight, destX, destY, destWidth, destHeight)

    return api
  }

  return api
}
