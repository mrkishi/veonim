import { style } from '../ui/uikit'
import vimUI from '../core/canvasgrid'

const IconStyle = { paddingRight: '6px' }

export default (name: string, color?: string) => {
  const component = require(`../icons/${name}`)
  if (!component || !component.default) throw new Error(`rendering: icon ${name} was not found`)
  return style(component.default)(IconStyle)({ color, size: vimUI.fontSize + 2 })
}
