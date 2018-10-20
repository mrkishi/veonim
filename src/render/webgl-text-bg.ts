import { WebGL2, VarKind } from '../render/webgl-utils'
import * as cc from '../core/canvas-container'

export default (webgl: WebGL2) => {
  const state = {
    canvasRes: { width: 0, height: 0 },
  }

  const resize = (width: number, height: number) => {
    Object.assign(state.canvasRes, { width, height })
  }

  return { resize }
}
