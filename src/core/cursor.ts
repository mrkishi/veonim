import { getWindow } from '../components/windows'
import { partialFill, translate } from '../ui/css'
import { merge } from '../support/utils'

export enum CursorShape {
  block,
  line,
  underline,
}

export const cursor = { row: 0, col: 0, color: '#fff' }
const cursorEl = document.getElementById('cursor') as HTMLElement
cursorEl.style.position = 'absolute'

export const setCursorShape = (type: CursorShape, size = 20) => {
  console.log('pls set cursor shape', type, size, partialFill)
  //if (type === CursorShape.block) merge(cursorEl.style, {
    //'mix-blend-mode': 'overlay',
    //background: cursor.color,
    //// TODO: this only needs to be calculated ONCE unless font changes
    //height: `${px.row.height(1)}px`,
    //width: `${px.col.width(1)}px`
  //})

  //if (type === CursorShape.line) merge(cursorEl.style, {
    //'mix-blend-mode': 'normal',
    //background: cursor.color,
    //height: `${px.row.height(1)}px`,
    //width: `${px.col.width(+(size / 100).toFixed(2))}px`
  //})

  //if (type === CursorShape.underline) merge(cursorEl.style, {
    //'mix-blend-mode': 'normal',
    //background: partialFill('horizontal', cursor.color, size),
    //height: `${px.row.height(1)}px`,
    //width: `${px.col.width(1)}px`
  //})
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
  if (!win) return console.error('window not found for cursor position. this is bad. very bad')

  // TODO: win positions are relative to canvas div. NEEDS TO BE ABSOLUTE TO CANVAS/Windows container div!
  cursorEl.style.transform = translate(win.px.col.x(cursor.col), win.px.row.y(cursor.row))
}

setCursorShape(CursorShape.block)
