import { h, app, Actions } from '../uikit'
import { translate } from '../css'
import vimUI from '../canvasgrid'

interface State {
  label: string,
  row: number,
  labelStart: string,
  currentParam: string,
  labelEnd: string,
  info: string,
  vis: boolean,
  x: number,
  y: number,
  anchorBottom: boolean,
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
  row: 0,
  labelStart: '',
  currentParam: '',
  labelEnd: '',
  info: '',
  vis: false,
  x: 0,
  y: 0,
  anchorBottom: true,
}

const bold = { 'font-weight': 'bold' }
const faded = { color: `rgba(255, 255, 255, 0.6)` }

// TODO: render info (documentation/more detail)
const view = ({ labelStart, currentParam, labelEnd, vis, x, y, anchorBottom }: State) => h('#hint', {
  hide: !vis,
  style: {
    // TODO: also need to anchor within bounds. min (editor left edge) - max (editor right edge)
    // TODO: difficult to know ahead of time the size of the content. let's say we are on row 1
    // and we think the hint will take up 1 row. there will be enough space if we put it on row 0
    // HOWEVER... if the hint content ends up taking more than 1 line(row) then it will clip outta bounds
    'z-index': 100,
    position: 'absolute',
    transform: translate(x, y),
  }
}, [
  h('div', {
    style: anchorBottom ? { transform: `translateY(-100%)` } : undefined
  }, [
    h('.hover', [
      h('span', { style: faded }, labelStart),
      h('span', { style: bold }, currentParam),
      h('span', { style: faded }, labelEnd),
    ]),
  ]),
])

const a: Actions<State> = {}

// this equals check will not refresh if we do sig hint calls > 1 on the same row... problemo?
a.show = (s, _a, { label, labelStart, currentParam, labelEnd, row, col }) => s.label === label && s.row === row
  ? { label, labelStart, currentParam, labelEnd, vis: true }
  : {
    row,
    label,
    labelStart,
    currentParam,
    labelEnd,
    x: vimUI.colToX(col),
    y: vimUI.rowToY(row > 2 ? row : row + 1),
    anchorBottom: row > 2,
    vis: true
  }

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
