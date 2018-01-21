import * as canvasContainer from '../core/canvas-container'
import { activeWindow } from '../core/windows'
import { h, app, Actions } from '../ui/uikit'
import Overlay from '../components/overlay'
import { ColorData } from '../ai/hover'
import { paddingVH } from '../ui/css'
import $$ from '../core/state'

interface State {
  value: ColorData[][],
  visible: boolean,
  x: number,
  y: number,
  anchorBottom: boolean,
  doc?: string,
}

interface ShowParams {
  row: number,
  col: number,
  data: ColorData[][],
  doc?: string,
}

const state: State = {
  value: [[]],
  visible: false,
  x: 0,
  y: 0,
  anchorBottom: true,
}

const docs = (data: string) => h('div', {
  style: {
    ...paddingVH(8, 6),
    overflow: 'visible',
    whiteSpace: 'normal',
    background: 'var(--background-45)',
    color: 'var(--foreground-40)',
    fontSize: `${canvasContainer.font.size - 2}px`,
  }
}, data)

const view = ($: State) => Overlay({
  name: 'hover',
  x: $.x,
  y: $.y,
  maxWidth: 600,
  visible: $.visible,
  anchorAbove: $.anchorBottom,
}, [

  $.doc && !$.anchorBottom && docs($.doc),

  ,h('div', {
    style: {
      background: 'var(--background-30)',
      padding: '8px',
    }
  }, $.value.map(m => h('div', {
    style: {
      display: 'flex',
      flexFlow: 'row wrap',
    }
  }, m.map(({ color, text }) => h('span', {
    style: {
      color: color || $$.foreground,
      'white-space': 'pre',
    }
  }, text)))))

  ,$.doc && $.anchorBottom && docs($.doc),

])

const a: Actions<State> = {}

a.hide = () => ({ visible: false })
a.show = (_s, _a, { value, row, col, doc }) => ({
  doc,
  value,
  x: activeWindow() ? activeWindow()!.colToX(col - 1) : 0,
  y: activeWindow() ? activeWindow()!.rowToTransformY(row > 2 ? row : row + 1) : 0,
  anchorBottom: row > 2,
  visible: true
})

const ui = app({ state, view, actions: a }, false)

export const show = ({ row, col, data, doc }: ShowParams) => ui.show({ value: data, doc, row, col })
export const hide = () => ui.hide()
