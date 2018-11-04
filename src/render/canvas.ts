import { getHighlight } from '../render/highlight-attributes'
import CreateCanvasBuffer from '../render/canvas-grid-buffer'
import { cell, font, pad } from '../core/canvas-container'

const lindt = () => {
  const canvas = document.createElement('canvas')
  const ui = canvas.getContext('2d', { alpha: true }) as CanvasRenderingContext2D
  const gridBuffer = CreateCanvasBuffer()
  let canvasWidth = 0
  let canvasWidthScaled = 0

  ui.imageSmoothingEnabled = false
  ui.font = `${font.size}px ${font.size}`

  const px = {
    row: {
      height: (row: number, scaled = false) => {
        return Math.floor(row * cell.height * (scaled ? window.devicePixelRatio : 1))
      },
      y: (row: number, scaled = false) => {
        return px.row.height(row, scaled) + (pad.y * (scaled ? window.devicePixelRatio : 1))
      },
    },
    col: {
      width: (col: number, scaled = false) => {
        return Math.floor(col * cell.width * (scaled ? window.devicePixelRatio : 1))
      },
      x: (col: number, scaled = false) => {
        return px.col.width(col, scaled) + (pad.x * (scaled ? window.devicePixelRatio : 1))
      },
    }
  }

  const resize = (rows: number, cols: number) => {
    const height = px.row.height(rows)
    canvasWidth = px.col.width(cols)
    canvasWidthScaled = Math.floor(canvasWidth * window.devicePixelRatio)

    canvas.height = Math.round(height * window.devicePixelRatio)
    canvas.width = canvasWidthScaled
    canvas.style.height = `${height}px`
    canvas.style.width = `${canvasWidth}px`

    // setting canvas properties resets font. need to reset it here
    ui.font = `${font.size}px ${font.face}`
    ui.textBaseline = 'top'
    ui.scale(window.devicePixelRatio, window.devicePixelRatio)
  }

  const clear = () => ui.clearRect(0, 0, canvas.width, canvas.height)

  const fillText = (col: number, row: number, char: string) => {
    const { height, width } = cell
    const y = row * cell.height
    const x = col * cell.width

    ui.save()
    ui.beginPath()
    ui.rect(x, y, width, height)
    ui.clip()
    // TODO: maxWidth setting? for unicode to scale down? otherwise will be clipped
    ui.fillText(char, x, y, width)
    ui.restore()
  }

  const clearRect = (col: number, row: number, width = 1, height = 1) => {
    ui.clearRect(px.col.x(col), px.row.y(row), px.col.width(width), px.row.height(height))
  }

  const render = (buffer: any[]) => {
    const size = buffer.length

    for (let ix = 0; ix < size; ix += 5) {
      const col = buffer[ix]
      const row = buffer[ix + 1]
      const hlid = buffer[ix + 2]
      const char = buffer[ix + 3]
      const repeat = buffer[ix + 4]

      const hlgrp = getHighlight(hlid)
      const defaultColor = getHighlight(0)
      if (!hlgrp || !defaultColor) throw new Error(`canvas render no highlight group found for hlid: ${hlid}`)

      clearRect(col, row, repeat)
      if (char === 32) return

      const defColor = hlgrp.reverse
        ? defaultColor.background as string
        : defaultColor.foreground as string

      ui.fillStyle = hlgrp.foreground || defColor

      for (let xx = 0; xx < repeat; xx++) {
        fillText(col, row, char)
      }
    }

    requestAnimationFrame(() => {
      const buf = gridBuffer.getBuffer()

      for (let ix = 0; ix < size; ix += 5) {
        buf[ix] = buffer[ix]
        buf[ix + 1] = buffer[ix + 1]
        buf[ix + 2] = buffer[ix + 2]
        buf[ix + 3] = buffer[ix + 3]
        buf[ix + 4] = buffer[ix + 4]
      }
    })
  }

  const moveRegionUp = (lines: number, top: number, bottom: number) => {
    const height = bottom - (top + lines) + 1

    const srcY = px.row.y(top + lines, true)
    const srcHeight = px.row.height(height, true)

    const destY = px.row.y(top)
    const destHeight = px.row.height(height)

    ui.drawImage(ui.canvas, 0, srcY, canvasWidthScaled, srcHeight, 0, destY, canvasWidth, destHeight)
    clearRect(0, top + lines, 103, lines)

    // TODO: move the grid buffer contents
  }

  const moveRegionDown = (lines: number, top: number, bottom: number) => {
    const height = bottom - (top + lines) + 1

    const srcY = px.row.y(top, true)
    const srcHeight = px.row.height(height, true)

    const destY = px.row.y(top + lines)
    const destHeight = px.row.height(height)

    ui.drawImage(ui.canvas, 0, srcY, canvasWidthScaled, srcHeight, 0, destY, canvasWidth, destHeight)

    // TODO: move the grid buffer contents
  }

  // TODO: underline?
  return { element: canvas, resize, clear, render, moveRegionUp, moveRegionDown }
}

export default lindt
export type CanvasRenderer = ReturnType<typeof lindt>
