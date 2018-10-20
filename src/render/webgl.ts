import CreateWebGL from '../render/webgl-utils'
import * as cc from '../core/canvas-container'
import TextFG from '../render/webgl-text-fg'
import TextBG from '../render/webgl-text-fg'
import { hexToRGB } from '../ui/css'

export default () => {
  const webgl = CreateWebGL({ alpha: false })
  const textFGRenderer = TextFG(webgl)
  const textBGRenderer = TextBG(webgl)
  const color = { r: 0, g: 0, b: 0 }

  const resize = (rows: number, cols: number) => {
    const width = cols * cc.cell.width
    const height = rows * cc.cell.height

    textFGRenderer.resize(width, height)
    textBGRenderer.resize(width, height)

    webgl.resize(width, height)
    webgl.gl.clearColor(color.r, color.g, color.b, 1)
    webgl.gl.clear(webgl.gl.COLOR_BUFFER_BIT | webgl.gl.DEPTH_BUFFER_BIT)
  }

  /** Change background color using a hex color code */
  const changeBackgroundColor = (hexColor: string) => {
    const [ r, g, b ] = hexToRGB(hexColor)
    Object.assign(color, {
      r: r / 255,
      g: g / 255,
      b: b / 255,
    })
    webgl.gl.clearColor(color.r, color.g, color.b, 1)
    webgl.gl.clear(webgl.gl.COLOR_BUFFER_BIT | webgl.gl.DEPTH_BUFFER_BIT)
  }

  /** Wrender data where each element is [ charCode, col, row, red, green, blue ] */
  const render = (data: number[]) => {
    textFGRenderer.activate()
    textFGRenderer.render(data)
  }

  return { changeBackgroundColor, render, resize, element: webgl.canvasElement }
}
