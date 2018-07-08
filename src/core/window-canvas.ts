import { cell, font, pad } from '../core/canvas-container'
import { is, merge } from '../support/utils'
import fontAtlas from '../core/font-atlas'
import { makel } from '../ui/vanilla'
import $$ from '../core/state'

export interface TransferRegion {
  width: number
  height: number
  source: {
    row: number
    col: number
  }
  destination: {
    row: number
    col: number
  }
}

export interface Specs {
  row: number
  col: number
  height: number
  width: number
  paddingX: number
  paddingY: number
}

export interface WindowCanvas {
  rowToY(row: number): number
  rowToTransformY(row: number): number
  relativeRowToY(row: number): number
  realtivePositionToPixels(row: number, col: number): { x: number, y: number }
  cellsToPixelWidth(cells: number): number
  colToX(col: number): number
  resize(rows: number, cols: number): WindowCanvas
  moveRegion(region: TransferRegion): WindowCanvas
  fillText(text: string, col: number, row: number): WindowCanvas
  fillRect(col: number, row: number, width: number, height: number): WindowCanvas
  underline(col: number, row: number, width: number, color: string): WindowCanvas
  clear(): WindowCanvas
  whereLine(row: number): { x: number, y: number, width: number }
  getCursorPosition(row: number, col: number): { x: number, y: number }
  setColor(color: string): WindowCanvas
  readonly width: string
  readonly height: string
}

export default () => {
  const container = makel({
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
    position: 'relative',
    background: 'var(--background)',
  })

  const canvas = document.createElement('canvas')
  const ui = canvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D
  const canvasBoxDimensions = { x: 0, y: 0, height: 0, width: 0 }
  const size = { rows: 0, cols: 0 }
  const canvasDimensions = { height: 0 }

  ui.imageSmoothingEnabled = false
  ui.font = `${font.size}px ${font.face}`
  container.appendChild(canvas)

  const px = {
    row: {
      height: (row: number, scaled = false) =>
        Math.floor(row * cell.height * (scaled ? window.devicePixelRatio : 1)),
      y: (row: number, scaled = false) =>
        px.row.height(row, scaled) + (pad.y * (scaled ? window.devicePixelRatio : 1)),
    },
    col: {
      width: (col: number, scaled = false) =>
        Math.floor(col * cell.width * (scaled ? window.devicePixelRatio : 1)),
      x: (col: number, scaled = false) =>
        px.col.width(col, scaled) + (pad.x * (scaled ? window.devicePixelRatio : 1)),
    }
  }

  const api = {
    get width() { return canvas.style.width },
    get height() { return canvas.style.height },
  } as WindowCanvas

  api.colToX = col => canvasBoxDimensions.x + px.col.x(col)
  api.rowToY = row => canvasBoxDimensions.y + px.row.y(row)
  api.cellsToPixelWidth = cells => px.col.width(cells)

  // TODO: revisit some of these methods
  // TODO: consumers of this should also add title height
  // because i suck at css
  api.rowToTransformY = row => canvasBoxDimensions.y + px.row.y(row)
  api.relativeRowToY = row => (cell.height * row) + pad.y + cell.padding
  api.realtivePositionToPixels = (row, col) => ({
    y: px.row.y(row),
    x: px.col.x(col),
  })

  const grabCanvasBoxDimensions = () => setImmediate(() => {
    const { top: y, left: x, height, width } = container.getBoundingClientRect()
    merge(canvasBoxDimensions, { y, x, height, width })
  })

  const shouldScrollOverflow = (row: number) => canvasBoxDimensions.height
    && px.row.y(row) + px.row.height(1) > canvasBoxDimensions.height

  const scrollReadjustAmount = () => (canvasDimensions.height - canvasBoxDimensions.height)
    + cell.padding

  api.resize = (rows, cols) => {
    merge(size, { rows, cols })
    // TODO: this is the old method where we laid out the container windows in the DOM
    // *BEFORE* rendering to canvas. now we want to do the opposite: render to canvas
    // first and then layout in DOM. we need to stop relying on parent container sizing
    // and calculate sizing based on given rows + cols by neovim
    const { height, width } = container.getBoundingClientRect()

    const vimHeight = px.row.height(rows) + (pad.y * 2)
    const heightToUse = Math.round(Math.max(height, vimHeight))

    canvas.height = Math.round(heightToUse * window.devicePixelRatio)
    canvas.width = Math.round(width * window.devicePixelRatio)
    canvas.style.height = `${heightToUse}px`
    canvas.style.width = `${width}px`

    // setting canvas properties resets font. need to reset it here
    ui.font = `${font.size}px ${font.face}`
    ui.textBaseline = 'top'
    ui.scale(window.devicePixelRatio, window.devicePixelRatio)
    ui.fillStyle = $$.background
    ui.fillRect(0, 0, canvas.width, canvas.height)

    canvasDimensions.height = heightToUse
    grabCanvasBoxDimensions()

    return api
  }

  api.setColor = color => (ui.fillStyle = color, api)
  api.clear = () => (ui.fillRect(0, 0, canvas.width, canvas.height), api)

  const drawText = (char: string, col: number, row: number) => {
    // const maxCharWidth = cell.width
    // TODO: i didn't see any changes to rendering artifacts, but then again i didn't
    // have any good test cases. right now if we do a pretty diff-so-fancy git diff output
    // the filename header sections uses a unicode char dash that is wider than the normal
    // ascii one. the wider one causes left over out of bounds artifacts on the left and
    // the right of the canvas grid. it's possible it does in the middle too, but haven't
    // tested yet. we should create an official test suite using the offending unicode char
    // and draw it in different places on the grid. then we can see if this maxWidth param
    // works as described or we need to come up with an alternative strategy
    ui.fillText(char, px.col.x(col), px.row.y(row) + cell.padding, /*maxCharWidth*/)
    return api
  }

  api.fillText = (char, col, row) => {
    if (typeof char !== 'string') return api
    if (!fontAtlas.exists) return drawText(char, col, row)

    const pos = fontAtlas.getCharPosition(char, ui.fillStyle as string)
    if (!pos) return drawText(char, col, row)

    const srcWidth = px.col.width(1, true)
    const srcHeight = px.row.height(1, true)

    const destX = px.col.x(col)
    const destY = px.row.y(row) + cell.padding
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
    const cellBottom = cell.height - cell.padding
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

  return { api, element: container }
}
