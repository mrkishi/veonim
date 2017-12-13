import { current as vimstate } from '../core/neovim'
import { translate, hexToRGBA } from '../ui/css'
import { h, app, Actions } from '../ui/uikit'
import vimUI from '../core/canvasgrid'

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

const bold = (color: string) => ({ color, 'font-weight': 'bold' })
const faded = (color: string) => ({ color: hexToRGBA(color, 0.6) })

let spacer: HTMLElement

// TODO: render info (documentation/more detail)
const view = ({ labelStart, currentParam, labelEnd, vis, x, y, anchorBottom }: State) => h('#hint', {
  style: {
    display: vis ? 'flex' : 'none',
    'z-index': 100,
    position: 'absolute',
    transform: translate(0, y),
    width: '100%',
  }
}, [
  h('div', {
    onupdate: (e: HTMLElement) => {
      spacer = e
    },
    style: { flex: `${x}px`, }
  }),
  h('div', {
    onupdate: (e: HTMLElement) => setTimeout(() => {
      const { width } = e.getBoundingClientRect()
      const okSize = Math.floor(window.innerWidth * 0.7)
      spacer.style[(<any>'max-width')] = width > okSize ? '30vw' : `${x}px`
      e.style[(<any>'opacity')] = '1'
    }, 1),
    style: {
      transform: anchorBottom ? `translateY(-100%)` : undefined,
      opacity: '0',
    }
  }, [
    h('.hover', {
      style: {}
    }, [
      h('span', { style: faded(vimstate.fg) }, labelStart),
      h('span', { style: bold(vimstate.fg) }, currentParam),
      h('span', { style: faded(vimstate.fg) }, labelEnd),
    ]),
  ]),
])

const a: Actions<State> = {}

// this equals check will not refresh if we do sig hint calls > 1 on the same row... problem? umad?
a.show = (s, _a, { label, labelStart, currentParam, labelEnd, row, col }) => s.label === label && s.row === row
  ? { label, labelStart, currentParam, labelEnd, vis: true }
  : {
    row,
    label,
    labelStart,
    currentParam,
    labelEnd,
    x: vimUI.colToX(col - 1),
    y: vimUI.rowToY(row > 2 ? row : row + 1),
    anchorBottom: row > 2,
    vis: true
  }

a.hide = () => ({ label: '', vis: false, row: 0 })

const ui = app({ state, view, actions: a }, false)

const sliceAndDiceLabel = (label: string, currentParam: string) => {
  const paramStart = label.indexOf(currentParam)
  const labelStart = label.slice(0, paramStart)
  const activeParam = label.slice(paramStart, paramStart + currentParam.length)
  const labelEnd = label.slice(paramStart + currentParam.length)
  return { labelStart, labelEnd, activeParam }
}

export const show = ({ row, col, label, currentParam, info }: ShowParams) => {
  const { labelStart, labelEnd, activeParam } = sliceAndDiceLabel(label, currentParam)

  ui.show({
    row,
    col,
    info,
    label,
    labelStart,
    labelEnd,
    currentParam: activeParam,
  })
}

export const hide = () => ui.hide()
