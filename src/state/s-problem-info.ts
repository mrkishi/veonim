import { on, go, initState, getState } from '../state/trade-federation'
import { debounce, merge } from '../support/utils'
import * as dispatch from '../messaging/dispatch'
import { activeWindow } from '../core/windows'
import { cursor } from '../core/cursor'

export interface ProblemInfo {
  x: number,
  y: number,
  value: string,
  visible: boolean,
  anchorBottom: boolean,
}

initState('problemInfo', {
  x: 0,
  y: 0,
  value: '',
  visible: false,
  anchorBottom: true,
} as ProblemInfo)

export interface Actions {
  showProblem: (errorMessage: string) => void,
  hideProblem: () => void,
  updateProblemPosition: () => void,
}

const getPosition = (row: number, col: number) => ({
  x: activeWindow() ? activeWindow()!.colToX(col - 1) : 0,
  y: activeWindow() ? activeWindow()!.rowToTransformY(row > 2 ? row : row + 1) : 0,
  anchorBottom: cursor.row > 2,
})

on.showProblem((s, errorMessage) => s.problemInfo = {
  ...s.problemInfo,
  ...getPosition(cursor.row, cursor.col),
  value: errorMessage,
  visible: true,
})

on.hideProblem(s => s.problemInfo.visible = false)

on.updateProblemPosition(s => {
  if (!s.problemInfo.visible) return
  merge(s.problemInfo, getPosition(cursor.row, cursor.col))
})

dispatch.sub('redraw', debounce(() => {
  getState().problemInfo.visible && go.updateProblemPosition()
}, 100))

