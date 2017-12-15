import vimUI from '../core/canvasgrid'

export default (name: string, color?: string) => {
  const component = require(`../icons/${name}`)
  if (!component || !component.default) throw new Error(`rendering: icon ${name} was not found`)
  return component.default({ color, size: vimUI.fontSize + 2 })
}
