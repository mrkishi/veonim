import { h, app, Actions } from '../uikit'
import { translate } from '../css'
import vimUI from '../canvasgrid'

interface State {
  label: string,
  labelStart: string,
  currentParam: string,
  labelEnd: string,
  info: string,
  vis: boolean,
  x: number,
  y: number,
}

interface ShowParams {
  row: number,
  col: number,
  label: string,
  currentParam: string,
  info?: string,
}

const state: State = {
  label: '',
  labelStart: '',
  currentParam: '',
  labelEnd: '',
  info: '',
  vis: false,
  x: 0,
  y: 0,
}

const bold = { 'font-weight': 'bold' }
const faded = { color: `rgba(255, 255, 255, 0.6)` }

// TODO: render info (documentation/more detail)
const view = ({ labelStart, currentParam, labelEnd, vis, x, y }: State) => h('#hint', {
  hide: !vis,
  style: {
    // TODO: need to anchor at bottom (if above) and top (if below)
    // because multi-line line can cover up current line
    // TODO: also need to anchor within bounds. min (editor left edge) - max (editor right edge)
    position: 'absolute',
    transform: translate(x, y),
  }
}, [
  h('div', {
    style: {
      transform: `translateY(-100%)`
    }
  }, [
    h('.hover', [
      h('span', { style: faded }, labelStart),
      h('span', { style: bold }, currentParam),
      h('span', { style: faded }, labelEnd),
    ]),
  ]),
])

const a: Actions<State> = {}

a.show = (s, _a, { label, labelStart, currentParam, labelEnd, row, col }) => s.label === label
  ? { label, labelStart, currentParam, labelEnd, vis: true }
  : { label, labelStart, currentParam, labelEnd, x: vimUI.colToX(col), y: vimUI.rowToY(row), vis: true }

a.hide = () => ({ vis: false })

const ui = app({ state, view, actions: a }, false)

export const show = ({ row, col, label, currentParam, info }: ShowParams) => {
  const paramStart = label.indexOf(currentParam)

  ui.show({
    row,
    col,
    info,
    label,
    labelStart: label.slice(0, paramStart),
    currentParam: label.slice(paramStart, paramStart + currentParam.length),
    labelEnd: label.slice(paramStart + currentParam.length),
  })
}

export const hide = () => ui.hide()
