import { on, initState } from '../state/trade-federation'
import { activeWindow } from '../core/windows'
import { cursor } from '../core/cursor'

export interface ColorPicker {
  color: string,
  visible: boolean,
  anchorBottom: boolean,
  x: number,
  y: number,
}

initState('colorPicker', {
  color: '',
  visible: false,
  anchorBottom: true,
  x: 0,
  y: 0,
} as ColorPicker)

export interface Actions {
  pickColor: (color: string) => void,
  hideColorPicker: () => void,
}

const getPosition = (row: number, col: number) => ({
  x: activeWindow() ? activeWindow()!.colToX(col - 1) : 0,
  y: activeWindow() ? activeWindow()!.rowToTransformY(row > 2 ? row : row + 1) : 0,
  anchorBottom: row > 12,
})

on.pickColor((s, color) => s.colorPicker = {
  ...s.colorPicker,
  ...getPosition(cursor.row, cursor.col),
  color,
  visible: true,
})

on.hideColorPicker(s => s.colorPicker.visible = false)
