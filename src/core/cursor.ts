import * as canvasContainer from '../core/canvas-container'
import { partialFill, translate } from '../ui/css'
import { getWindow } from '../components/windows'
import { merge } from '../support/utils'
import { get } from '../core/grid'

export enum CursorShape {
  block,
  line,
  underline,
}

export const cursor = { row: 0, col: 0, color: '#fff' }
const cursorEl = document.getElementById('cursor') as HTMLElement
merge(cursorEl.style, {
  position: 'absolute',
  color: '#000',
  'mix-blend-mode': 'difference',
})

export const setCursorShape = (type: CursorShape, size = 20) => {
  if (type === CursorShape.block) merge(cursorEl.style, {
    //'mix-blend-mode': 'difference',
    background: cursor.color,
    height: `${canvasContainer.cell.height}px`,
    width: `${canvasContainer.cell.width}px`,
  })

  if (type === CursorShape.line) merge(cursorEl.style, {
    //'mix-blend-mode': 'normal',
    background: cursor.color,
    height: `${canvasContainer.cell.height}px`,
    width: `${(canvasContainer.cell.width * (size / 100)).toFixed(2)}px`
  })

  if (type === CursorShape.underline) merge(cursorEl.style, {
    //'mix-blend-mode': 'normal',
    background: partialFill('horizontal', cursor.color, size),
    height: `${canvasContainer.cell.height}px`,
    width: `${canvasContainer.cell.width}px`,
  })
}

export const setCursorColor = (color: string) => {
  // TODO: invert text color. now that we have grid cache this should be more feasible
  cursor.color = color
  // TODO: disable fancy blending option
  cursorEl.style.background = color
}

export const hideCursor = () => merge(cursorEl.style, { display: 'none' })
export const showCursor = () => merge(cursorEl.style, { display: 'block' })
export const moveCursor = () => {
  const win = getWindow(cursor.row, cursor.col)
  if (!win) return
  cursorEl.style.transform = translate(win.colToX(cursor.col), win.rowToY(cursor.row))
  const [ char ] = get(cursor.row, cursor.col)
  //cursorEl.innerText = char
  console.log('char at cusror:', char)
}

setCursorShape(CursorShape.block)
