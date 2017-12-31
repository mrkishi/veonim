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
  paddingX: number,
  paddingY: number,
}

export interface CanvasWindow {
  getSpecs(): Specs,
  setSpecs(row: number, col: number, height: number, width: number, paddingX?: number, paddingY?: number): CanvasWindow,
  rowToY(row: number): number,
  colToX(col: number): number,
  resize(canvasBox: HTMLElement, initBackgroundColor: string): CanvasWindow,
  moveRegion(region: TransferRegion): CanvasWindow,
  fillText(text: string, col: number, row: number): CanvasWindow,
  fillRect(col: number, row: number, width: number, height: number): CanvasWindow,
  drawLine(col: number, row: number, width: number): CanvasWindow,
  setTextBaseline(mode: string): CanvasWindow,
  clear(): CanvasWindow,
  setColor(color: string): CanvasWindow,
  readonly width: string,
  readonly height: string,
}

export const createWindow = (container: HTMLElement) => {
  const canvas = document.createElement('canvas')
  const ui = canvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D
  const specs = { row: 0, col: 0, height: 0, width: 0, paddingX: 0, paddingY: 0 }
  const position = { x: 0, y: 0 }

  ui.imageSmoothingEnabled = false
  ui.font = `${canvasContainer.font.size}px ${canvasContainer.font.face}`
  container.appendChild(canvas)
  canvasContainer.on('font', ({ size, face }) => ui.font = `${size}px ${face}`)

  const px = {
    row: {
      height: (row: number, scaled = false) =>
        Math.floor(row * canvasContainer.cell.height * (scaled ? window.devicePixelRatio : 1)),
      y: (row: number, scaled = false) =>
        px.row.height(row - specs.row, scaled) + (specs.paddingY * (scaled ? window.devicePixelRatio : 1)),
    },
    col: {
      width: (col: number, scaled = false) =>
        Math.floor(col * canvasContainer.cell.width * (scaled ? window.devicePixelRatio : 1)),
      x: (col: number, scaled = false) =>
        px.col.width(col - specs.col, scaled) + (specs.paddingX * (scaled ? window.devicePixelRatio : 1)),
    }
  }

  const api = {
    get width() { return canvas.style.width },
    get height() { return canvas.style.height },
  } as CanvasWindow

  api.getSpecs = () => specs
  api.setSpecs = (row, col, height, width, paddingX = 0, paddingY = 0) => (merge(specs, { row, col, height, width, paddingX, paddingY }), api)

  api.colToX = col => position.x + px.col.x(col)
  api.rowToY = row => position.y + px.row.y(row)

  const grabPosition = (canvasBox: HTMLElement) => setImmediate(() => {
    const { top: y, left: x } = canvasBox.getBoundingClientRect()
    merge(position, { y, x })
  })

  api.resize = (canvasBox, initBackgroundColor) => {
    const height = px.row.height(specs.height + 1)
    const width = px.col.width(specs.width)

    canvas.height = height * window.devicePixelRatio
    canvas.width = width * window.devicePixelRatio
    canvas.style.height = `${height}px`
    canvas.style.width = `${width}px`

    // setting canvas properties resets font. need to reset it here
    ui.font = `${canvasContainer.font.size}px ${canvasContainer.font.face}`
    ui.scale(window.devicePixelRatio, window.devicePixelRatio)
    ui.fillStyle = initBackgroundColor
    ui.fillRect(0, 0, canvas.width, canvas.height)

    grabPosition(canvasBox)

    return api
  }

  api.setColor = color => (ui.fillStyle = color, api)
  api.clear = () => (ui.fillRect(0, 0, canvas.width, canvas.height), api)
  api.setTextBaseline = mode => (ui.textBaseline = mode, api)
  api.fillText = (m, c, r) => {
    ui.fillText(m, px.col.x(c), px.row.y(r) + canvasContainer.cell.padding)
    return api
  }

  api.fillRect = (c, r, w, h) => {
    ui.fillRect(px.col.x(c), px.row.y(r), px.col.width(w), px.row.height(h))
    return api
  }

  api.moveRegion = ({ width, height, source, destination }) => {
    const srcX = px.col.x(source.col, true)
    const srcY = px.row.y(source.row, true)
    const srcWidth = px.col.width(width, true)
    const srcHeight = px.row.height(height, true)

    const destX = px.col.x(destination.col)
    const destY = px.row.y(destination.row)
    const destWidth = px.col.width(width)
    const destHeight = px.row.height(height)

    ui.drawImage(ui.canvas, srcX, srcY, srcWidth, srcHeight, destX, destY, destWidth, destHeight)

    return api
  }

  api.drawLine = (col, row, width) => {
    ui.fillRect(px.col.x(col), px.row.y(row) + (canvasContainer.cell.height - 3), px.col.width(width), 1)
    return api
  }

  return api
}
