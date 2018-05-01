import { hexToRGBA, partialFill, translate } from '../ui/css'
import * as canvasContainer from '../core/canvas-container'
import { SHADOW_BUFFER_TYPE } from '../support/constants'
import { CanvasWindow } from '../core/canvas-window'
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
let cursorRequestedToBeHidden = false

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
  justifyContent: 'center',
  alignItems: 'center',
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
  cursorRequestedToBeHidden = true
  cursorEl.style.display = 'none'
  cursorline.style.display = 'none'
}

export const showCursor = () => {
  cursorRequestedToBeHidden = false
  cursorEl.style.display = 'flex'
  cursorline.style.display = ''
}

export const showCursorline = () => {
  cursorline.style.display = ''
}

const moveCursorLine = (win: CanvasWindow, backgroundColor: string) => {
  const { x, y, width } = win.whereLine(cursor.row)

  merge(cursorline.style, {
    display: '',
    background: hexToRGBA(backgroundColor, 0.2),
    transform: translate(x, y),
    width: `${width}px`,
  })
}

export const moveCursor = (backgroundColor: string) => {
  const res = getWindow(cursor.row, cursor.col, { getStuff: true })
  if (!res || !res.canvas) return
  const { canvas, win } = res

  if (cursorRequestedToBeHidden) return
  const isShadowBuffer = win.filetype === SHADOW_BUFFER_TYPE

  // console.log('win ft:', win.filetype)
  // setImmediate(() => console.log('win ft2:', win.filetype))

  if (isShadowBuffer) return cursorEl.style.display = 'none'
  else cursorEl.style.display = 'flex'

  const { x, y } = canvas.getCursorPosition(cursor.row, cursor.col)
  cursorEl.style.transform = translate(x, y)

  if (cursor.type === CursorShape.block) {
    const [ char ] = get(cursor.row, cursor.col)
    cursorChar.innerText = char
    cursorChar.style.display = ''
  }

  else {
    cursorChar.style.display = 'none'
    cursorChar.innerText = ''
  }

  moveCursorLine(canvas, backgroundColor)
}

setCursorShape(CursorShape.block)
