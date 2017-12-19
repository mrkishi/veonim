import vimUI from '../core/canvasgrid'

export interface IconParams {
  color?: string,
  size?: number,
  weight?: number,
}

export default (name: string, params?: IconParams) => {
  const { color, weight, size = vimUI.fontSize + 2 } = params || {} as IconParams
  const component = require(`../icons/${name}`)
  if (!component || !component.default) throw new Error(`rendering: icon ${name} was not found`)
  return component.default({ color, size, weight })
}
