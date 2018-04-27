import * as canvasContainer from '../core/canvas-container'
import { pascalCase } from '../support/utils'
import * as Icons from 'hyperapp-feather'
import { h } from '../ui/uikit'

export interface IconParams {
  color?: string,
  size?: number,
  weight?: number,
}

export default (name: string, params = {} as IconParams) => {
  const { color, weight, size = canvasContainer.font.size + 2 } = params
  const component = Reflect.get(Icons, pascalCase(name))
  if (!component) throw new Error(`rendering: icon ${name} was not found`)

  return h(component, { color, weight, size })
}
