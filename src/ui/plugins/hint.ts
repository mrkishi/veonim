import { h, app, Actions } from '../uikit'
import { translate } from '../css'

interface State {
  labelStart: string,
  currentParam: string,
  labelEnd: string,
  info: string,
  vis: boolean,
  x: number,
  y: number,
}

interface ShowParams {
  x: number,
  y: number,
  label: string,
  currentParam: string,
  info?: string,
}

const state: State = {
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
    position: 'absolute',
    transform: translate(x, y),
  }
}, [
  h('.hover', [
    h('span', { style: faded }, labelStart),
    h('span', { style: bold }, currentParam),
    h('span', { style: faded }, labelEnd),
  ]),
])

const a: Actions<State> = {}

// TODO; don't reposition if already active
// use hash to compare label value if same as previous, then don't update x+y
a.show = (_s, _a, { labelStart, currentParam, labelEnd, x, y }) => {
  return { labelStart, currentParam, labelEnd, x, y, vis: true }
}

a.hide = () => ({ vis: false })

const ui = app({ state, view, actions: a }, false)

export const show = ({ x, y, label, currentParam, info }: ShowParams) => {
  const paramStart = label.indexOf(currentParam)

  ui.show({
    x,
    y,
    info,
    labelStart: label.slice(0, paramStart),
    currentParam: label.slice(paramStart, paramStart + currentParam.length),
    labelEnd: label.slice(paramStart + currentParam.length),
  })
}

export const hide = () => ui.hide()
