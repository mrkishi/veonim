import * as canvasContainer from '../core/canvas-container'
import { is, merge } from '../support/utils'
import fontAtlas from '../core/font-atlas'
import * as title from '../core/title'

export enum CursorShape {
  block,
  line,
  underline,
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
  rowToTransformY(row: number): number,
  colToX(col: number): number,
  resize(canvasBox: HTMLElement, initBackgroundColor: string): CanvasWindow,
  moveRegion(region: TransferRegion): CanvasWindow,
  fillText(text: string, col: number, row: number): CanvasWindow,
  fillRect(col: number, row: number, width: number, height: number): CanvasWindow,
  underline(col: number, row: number, width: number, color: string): CanvasWindow,
  setTextBaseline(mode: string): CanvasWindow,
  clear(): CanvasWindow,
  whereLine(row: number): { x: number, y: number, width: number },
  getCursorPosition(row: number, col: number): { x: number, y: number },
  setColor(color: string): CanvasWindow,
  readonly width: string,
  readonly height: string,
}

export const createWindow = (container: HTMLElement) => {
  const canvas = document.createElement('canvas')
  const ui = canvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D
  const specs = { row: 0, col: 0, height: 0, width: 0, paddingX: 0, paddingY: 0 }
  const canvasBoxDimensions = { x: 0, y: 0, height: 0, width: 0 }
  const canvasDimensions = { height: 0 }

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

  api.colToX = col => canvasBoxDimensions.x + px.col.x(col)
  api.rowToY = row => canvasBoxDimensions.y + px.row.y(row)

  // because i suck at css
  api.rowToTransformY = row => canvasBoxDimensions.y + px.row.y(row) - title.specs.height

  const grabCanvasBoxDimensions = (canvasBox: HTMLElement) => setImmediate(() => {
    const { top: y, left: x, height, width } = canvasBox.getBoundingClientRect()
    merge(canvasBoxDimensions, { y, x, height, width })
  })

  const shouldScrollOverflow = (row: number) => canvasBoxDimensions.height
    && px.row.y(row) + px.row.height(1) > canvasBoxDimensions.height

  const scrollReadjustAmount = () => (canvasDimensions.height - canvasBoxDimensions.height)
    + canvasContainer.cell.padding

  api.resize = (canvasBox, initBackgroundColor) => {
    const { height, width } = container.getBoundingClientRect()

    const vimHeight = px.row.height(specs.height) + (specs.paddingY * 2)
    const heightToUse = Math.max(height, vimHeight)

    canvas.height = heightToUse * window.devicePixelRatio
    canvas.width = width * window.devicePixelRatio
    canvas.style.height = `${heightToUse}px`
    canvas.style.width = `${width}px`

    // setting canvas properties resets font. need to reset it here
    ui.font = `${canvasContainer.font.size}px ${canvasContainer.font.face}`
    ui.scale(window.devicePixelRatio, window.devicePixelRatio)
    ui.fillStyle = initBackgroundColor
    ui.fillRect(0, 0, canvas.width, canvas.height)

    canvasDimensions.height = heightToUse
    grabCanvasBoxDimensions(canvasBox)

    return api
  }

  api.setColor = color => (ui.fillStyle = color, api)
  api.clear = () => (ui.fillRect(0, 0, canvas.width, canvas.height), api)
  api.setTextBaseline = mode => (ui.textBaseline = mode, api)

  const drawText = (char: string, col: number, row: number) => {
    ui.fillText(char, px.col.x(col), px.row.y(row) + canvasContainer.cell.padding)
    return api
  }

  api.fillText = (char, col, row) => {
    if (!is.string(char)) return api

    if (!fontAtlas.exists) return drawText(char, col, row)
    if (char.length > 1) throw new Error(`fill text faster does not implement
    the ability to wrender strings of chars, but only a single char. should
    refactor if needed. at the time of this writing the vim render strategy wrenders
      only one charater at a time`)

    const pos = fontAtlas.getCharPosition(char, ui.fillStyle as string)
    if (!pos) return drawText(char, col, row)

    const srcWidth = px.col.width(1, true)
    const srcHeight = px.row.height(1, true)

    const destX = px.col.x(col)
    const destY = px.row.y(row) + canvasContainer.cell.padding
    const destWidth = px.col.width(1)
    const destHeight = px.row.height(1)

    ui.drawImage(fontAtlas.bitmap, pos.x, pos.y, srcWidth, srcHeight, destX, destY, destWidth, destHeight)

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

  api.getCursorPosition = (row, col) => {
    const scrollPls = shouldScrollOverflow(row)
    const readjust = scrollPls ? scrollReadjustAmount() : 0

    return {
      x: canvasBoxDimensions.x + px.col.x(col),
      y: canvasBoxDimensions.y + px.row.y(row) - readjust,
    }
  }

  api.whereLine = row => {
    const scrollPls = shouldScrollOverflow(row)
    const readjust = scrollPls ? scrollReadjustAmount() : 0

    container.scrollTop = scrollPls ? container.scrollHeight : 0

    return {
      x: canvasBoxDimensions.x,
      y: canvasBoxDimensions.y + px.row.y(row) - readjust,
      width: Math.ceil(canvas.width / window.devicePixelRatio),
    }
  }

  api.underline = (col, row, width, color) => {
    const cellBottom = canvasContainer.cell.height - canvasContainer.cell.padding
    const x = px.col.x(col)
    const y = px.row.y(row) + cellBottom
    const w = px.col.width(width)

    ui.beginPath()
    ui.strokeStyle = color
    ui.lineWidth = 1
    ui.moveTo(x, y)
    ui.lineTo(x + w, y)
    ui.stroke()

    return api
  }

  return api
}
