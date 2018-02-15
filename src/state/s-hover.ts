import { on } from '../state/trade-federation'
import { ColorData } from '../ai/hover'

export interface Hover {
  value: ColorData[][],
  anchorBottom: boolean,
  visible: boolean,
  doc?: string,
}

const state: Hover = {
  value: [[]],
  visible: false,
  anchorBottom: true,
}

export default state
export type ActionTypes = 'showHover' | 'hideHover'

on.showHover((s, colorData) => s.hover = {
  ...s.hover,
  value: colorData,
  visible: true,
})

on.hideHover(s => s.hover.visible = false)
