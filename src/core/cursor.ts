import * as canvasContainer from '../core/canvas-container'
import { hexToRGBA, partialFill, translate } from '../ui/css'
import { getWindow } from '../core/windows'
import { merge } from '../support/utils'
import { get } from '../core/grid'

export enum CursorShape {
  block,
  line,
  underline,
}

export const cursor = { row: 0, col: 0, color: '#fff', type: CursorShape.block }
const cursorEl = document.getElementById('cursor') as HTMLElement
const cursorChar = document.createElement('span')
const cursorline = document.getElementById('cursorline') as HTMLElement

merge(cursorline.style, {
  position: 'absolute',
  mixBlendMode: 'screen',
  height: `${canvasContainer.cell.height}px`,
  zIndex: 60,
})

merge(cursorEl.style, {
  zIndex: 70,
  position: 'absolute',
  display: 'flex',
  'justify-content': 'center',
  'align-items': 'center',
})

cursorChar.style.filter = 'invert(1) grayscale(1)'
cursorEl.appendChild(cursorChar)

export const setCursorShape = (type: CursorShape, size = 20) => {
  cursor.type = type

  if (type === CursorShape.block) merge(cursorEl.style, {
    background: cursor.color,
    height: `${canvasContainer.cell.height}px`,
    width: `${canvasContainer.cell.width}px`,
  })

  if (type === CursorShape.line) merge(cursorEl.style, {
    background: cursor.color,
    height: `${canvasContainer.cell.height}px`,
    width: `${(canvasContainer.cell.width * (size / 100)).toFixed(2)}px`
  })

  if (type === CursorShape.underline) merge(cursorEl.style, {
    background: partialFill('horizontal', cursor.color, size),
    height: `${canvasContainer.cell.height}px`,
    width: `${canvasContainer.cell.width}px`,
  })
}

export const setCursorColor = (color: string) => {
  cursorChar.style.color = color
  cursor.color = color
  cursorEl.style.background = color
}

export const hideCursor = () => {
  cursorEl.style.display = 'none'
  cursorline.style.display = 'none'
}

export const showCursor = () => {
  cursorEl.style.display = 'flex'
  cursorline.style.display = ''
}

export const moveCursor = (backgroundColor: string) => {
  const win = getWindow(cursor.row, cursor.col)
  if (!win) return

  cursorEl.style.transform = translate(win.colToX(cursor.col), win.rowToY(cursor.row))

  if (cursor.type === CursorShape.block) {
    const [ char ] = get(cursor.row, cursor.col)
    cursorChar.innerText = char
    cursorChar.style.display = ''
  }

  else {
    cursorChar.style.display = 'none'
    cursorChar.innerText = ''
  }

  const { x, y, width } = win.whereLine(cursor.row)

  merge(cursorline.style, {
    display: '',
    background: hexToRGBA(backgroundColor, 0.2),
    transform: translate(x, y),
    width: `${width}px`,
  })
}

setCursorShape(CursorShape.block)
