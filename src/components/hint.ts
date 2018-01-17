import { current as vimstate } from '../core/neovim'
import { h, app, style, Actions } from '../ui/uikit'
import { translate, bold, faded } from '../ui/css'
import { activeWindow } from '../core/windows'

interface State {
  label: string,
  row: number,
  labelStart: string,
  currentParam: string,
  labelEnd: string,
  documentation: string,
  paramDoc: string,
  vis: boolean,
  x: number,
  y: number,
  anchorBottom: boolean,
  totalSignatures: number,
  selectedSignature: number,
}

interface ShowParams {
  row: number,
  col: number,
  label: string,
  currentParam: string,
  documentation?: string,
  paramDoc?: string,
  totalSignatures: number,
  selectedSignature: number,
}

const state: State = {
  label: '',
  row: 0,
  labelStart: '',
  currentParam: '',
  labelEnd: '',
  documentation: '',
  paramDoc: '',
  vis: false,
  x: 0,
  y: 0,
  anchorBottom: true,
  totalSignatures: 0,
  selectedSignature: 0,
}

let spacer: HTMLElement

const Doc = style('div')({
  paddingBottom: '4px',
  color: vimstate.fg || '#aaa',
})

const view = ($: State) => h('#hint', {
  style: {
    display: $.vis ? 'flex' : 'none',
    zIndex: 100,
    position: 'absolute',
    transform: translate(0, $.y),
    width: '100%',
    maxWidth: '600px',
  }
}, [
  ,h('div', {
    onupdate: (e: HTMLElement) => {
      spacer = e
    },
    style: { flex: `${$.x}px`, }
  })

  ,h('div', {
    onupdate: (e: HTMLElement) => setTimeout(() => {
      const { width } = e.getBoundingClientRect()
      const okSize = Math.floor(window.innerWidth * 0.7)
      spacer.style[(<any>'max-width')] = width > okSize ? '30vw' : `${$.x}px`
      // TODO: this was used for figuring out placement, but it was causing flickering
      // on every update, so temp disable to see how bad it is without pre-emptive pos calc
      //e.style[(<any>'opacity')] = '1'
    }, 1),
    style: {
      transform: $.anchorBottom ? `translateY(-100%)` : undefined,
      // TODO: need this?
      //opacity: '0',
    }
  }, [
    ,h('div', {
      style: {
        background: 'var(--background-30)',
        color: '#eee',
        padding: '8px',
      }
    }, [
      ,h('div', { style: {
        paddingBottom: $.documentation || $.paramDoc ? '8px' : undefined
      } }, [
        ,$.documentation && Doc({}, $.documentation)
        ,$.paramDoc && Doc({}, $.paramDoc)
      ])

      ,h('div', { style: { display: 'flex' } }, [
        ,h('div', [
          ,h('span', { style: faded(vimstate.fg, 0.6) }, $.labelStart)
          ,h('span', { style: bold(vimstate.fg) }, $.currentParam)
          ,h('span', { style: faded(vimstate.fg, 0.6) }, $.labelEnd)
        ])

        ,h('div', {
          hide: $.totalSignatures < 2,
          style: {
            paddingLeft: '4px',
            color: vimstate.fg,
          },
        }, `${$.selectedSignature}/${$.totalSignatures}`)
      ])
    ])
  ])
])

const a: Actions<State> = {}

// this equals check will not refresh if we do sig hint calls > 1 on the same row... problem? umad?
a.show = (s, _a, { label, labelStart, currentParam, labelEnd, row, col, selectedSignature, totalSignatures, documentation, paramDoc }) => s.label === label && s.row === row
  ? {
    label,
    labelStart,
    currentParam,
    labelEnd,
    paramDoc,
    vis: true
  }
  : {
    row,
    label,
    labelStart,
    labelEnd,
    documentation,
    paramDoc,
    currentParam,
    selectedSignature,
    totalSignatures,
    x: activeWindow() ? activeWindow()!.colToX(col - 1) : 0,
    y: activeWindow() ? activeWindow()!.rowToTransformY(row > 2 ? row : row + 1) : 0,
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

export const show = ({ row, col, label, currentParam, documentation, paramDoc, selectedSignature, totalSignatures }: ShowParams) => {
  const { labelStart, labelEnd, activeParam } = sliceAndDiceLabel(label, currentParam)

  ui.show({
    row,
    col,
    paramDoc,
    documentation,
    label,
    labelStart,
    labelEnd,
    selectedSignature,
    totalSignatures,
    currentParam: activeParam,
  })
}

export const hide = () => ui.hide()
