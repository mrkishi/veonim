import * as canvasContainer from '../core/canvas-container'
import { activeWindow } from '../core/windows'
import { h, app, Actions } from '../ui/uikit'
import Overlay from '../components/overlay'
import { colors } from '../styles/common'
import Icon from '../components/icon'

interface State {
  value: string,
  visible: boolean,
  x: number,
  y: number,
  anchorBottom: boolean,
}

interface ShowParams {
  row: number,
  col: number,
  data: string,
}

const state: State = {
  value: '',
  visible: false,
  x: 0,
  y: 0,
  anchorBottom: true,
}

const view = ($: State) => Overlay({
  name: 'problem-info',
  x: $.x,
  y: $.y,
  maxWidth: 600,
  visible: $.visible,
  anchorAbove: $.anchorBottom,
}, [

  ,h('div', {
    style: {
      background: 'var(--background-30)',
      color: 'var(--foreground)',
      padding: '8px',
      display: 'flex',
      alignItems: 'center',
    }
  }, [

    ,h('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        paddingRight: '8px',
      }
    }, [
      Icon('error', {
        color: colors.error,
        size: canvasContainer.font.size + 4,
      })
    ])

    ,h('div', $.value)

  ])

])

const a: Actions<State> = {}

a.hide = () => ({ visible: false })
a.show = (_s, _a, { value, row, col }) => ({
  value,
  x: activeWindow() ? activeWindow()!.colToX(col - 1) : 0,
  y: activeWindow() ? activeWindow()!.rowToTransformY(row > 2 ? row : row + 1) : 0,
  anchorBottom: row > 2,
  visible: true
})

const ui = app({ state, view, actions: a }, false)

export const show = ({ row, col, data }: ShowParams) => ui.show({ value: data, row, col })
export const hide = () => ui.hide()
