import * as canvasContainer from '../core/canvas-container'

export interface IconParams {
  color?: string,
  size?: number,
  weight?: number,
}

export default (name: string, params = {} as IconParams) => {
  const { color, weight, size = canvasContainer.font.size + 2 } = params || {} as IconParams
  const component = require(`../icons/${name}`)
  if (!component || !component.default) throw new Error(`rendering: icon ${name} was not found`)
  return component.default({ color, size, weight })
}
