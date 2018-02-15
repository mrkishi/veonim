import { on, initState } from '../state/trade-federation'
import { ColorData } from '../ai/hover'

export interface Hover {
  value: ColorData[][],
  anchorBottom: boolean,
  visible: boolean,
  doc?: string,
  row: number,
  col: number,
}

export interface ShowParams {
  row: number,
  col: number,
  data: ColorData[][],
  doc?: string,
}

const state: Hover = {
  value: [[]],
  visible: false,
  anchorBottom: true,
  row: 0,
  col: 0,
}

initState('hover', state)

export interface Actions {
  showHover: (params: ShowParams) => void,
  hideHover: () => void,
}

on.showHover((s, { row, col, data, doc }) => s.hover = {
  ...s.hover,
  row,
  col,
  doc,
  value: data,
  visible: true,
  anchorBottom: row > 2,
})

on.hideHover(s => s.hover.visible = false)
