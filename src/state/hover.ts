import { on, go, initState, getState } from '../state/trade-federation'
import { debounce, merge } from '../support/utils'
import * as dispatch from '../messaging/dispatch'
import { activeWindow } from '../core/windows'
import { ColorData } from '../ai/hover'
import { cursor } from '../core/cursor'

export interface Hover {
  value: ColorData[][],
  anchorBottom: boolean,
  visible: boolean,
  doc?: string,
  x: number,
  y: number,
}

export interface ShowParams {
  data: ColorData[][],
  doc?: string,
}

initState('hover', {
  value: [[]],
  visible: false,
  anchorBottom: true,
  x: 0,
  y: 0,
} as Hover)

export interface Actions {
  showHover: (params: ShowParams) => void,
  hideHover: () => void,
  updateHoverPosition: () => void,
    updateHover: (val: string) => void,
}

const getPosition = (row: number, col: number) => ({
  x: activeWindow() ? activeWindow()!.colToX(col - 1) : 0,
  y: activeWindow() ? activeWindow()!.rowToTransformY(row > 2 ? row : row + 1) : 0,
  anchorBottom: cursor.row > 2,
})

on.showHover((s, { data, doc }) => s.hover = {
  ...s.hover,
  ...getPosition(cursor.row, cursor.col),
  doc,
  value: data,
  visible: true,
})

on.hideHover(s => s.hover.visible = false)

on.updateHoverPosition(s => {
  if (!s.hover.visible) return
  merge(s.hover, getPosition(cursor.row, cursor.col))
})

dispatch.sub('redraw', debounce(() => {
  getState().hover.visible && go.updateHoverPosition()
}, 50))
