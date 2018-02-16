import { on, go, initState } from '../state/trade-federation'
import { debounce, merge } from '../support/utils'
import * as dispatch from '../messaging/dispatch'
import { activeWindow } from '../core/windows'
import { ColorData } from '../ai/hover'

export interface Hover {
  value: ColorData[][],
  anchorBottom: boolean,
  visible: boolean,
  doc?: string,
  row: number,
  col: number,
  x: number,
  y: number,
}

export interface ShowParams {
  row: number,
  col: number,
  data: ColorData[][],
  doc?: string,
}

initState('hover', {
  value: [[]],
  visible: false,
  anchorBottom: true,
  row: 0,
  col: 0,
  x: 0,
  y: 0,
} as Hover)

export interface Actions {
  showHover: (params: ShowParams) => void,
  hideHover: () => void,
  updateHoverPosition: () => void,
}

const getPosition = (row: number, col: number) => ({
  x: activeWindow() ? activeWindow()!.colToX(col - 1) : 0,
  y: activeWindow() ? activeWindow()!.rowToTransformY(row > 2 ? row : row + 1) : 0,
})

on.showHover((s, { row, col, data, doc }) => s.hover = {
  ...s.hover,
  ...getPosition(row, col),
  row,
  col,
  doc,
  value: data,
  visible: true,
  anchorBottom: row > 2,
})

on.hideHover(s => s.hover.visible = false)

on.updateHoverPosition(s => {
  if (!s.hover.visible) return
  const { row, col } = s.hover
  merge(s.hover, getPosition(row, col))
})

dispatch.sub('redraw', debounce(go.updateHoverPosition, 500))
