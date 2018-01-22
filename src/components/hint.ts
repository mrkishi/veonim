import * as canvasContainer from '../core/canvas-container'
import { bold, faded, paddingVH } from '../ui/css'
import { activeWindow } from '../core/windows'
import { h, app, Actions } from '../ui/uikit'
import Overlay from '../components/overlay'
import $$ from '../core/state'

interface State {
  label: string,
  row: number,
  labelStart: string,
  currentParam: string,
  labelEnd: string,
  documentation: string,
  paramDoc: string,
  visible: boolean,
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
  visible: false,
  x: 0,
  y: 0,
  anchorBottom: true,
  totalSignatures: 0,
  selectedSignature: 0,
}

const docs = (data: string) => h('div', {
  style: {
    overflow: 'visible',
    whiteSpace: 'normal',
    ...paddingVH(8, 6),
    fontSize: `${canvasContainer.font.size - 2}px`,
    color: 'var(--foreground-40)',
  }
}, data)

const view = ($: State) => Overlay({
  name: 'hint',
  x: $.x,
  y: $.y,
  zIndex: 200,
  maxWidth: 600,
  visible: $.visible,
  anchorAbove: $.anchorBottom,
}, [

  ,h('div', {
    style: {
      background: 'var(--background-30)',
    }
  }, [
    ,h('div', { style: {
      background: 'var(--background-45)',
      paddingBottom: $.documentation || $.paramDoc ? '2px' : undefined
    } }, [
      ,$.documentation && docs($.documentation)
      ,$.paramDoc && docs($.paramDoc)
    ])

    ,h('div', { style: {
      display: 'flex',
      padding: '8px',
    } }, [
      ,h('div', [
        ,h('span', { style: faded($$.foreground, 0.6) }, $.labelStart)
        ,h('span', { style: bold($$.foreground) }, $.currentParam)
        ,h('span', { style: faded($$.foreground, 0.6) }, $.labelEnd)
      ])

      ,h('div', {
        hide: $.totalSignatures < 2,
        style: {
          paddingLeft: '4px',
          color: 'var(--foreground)',
        },
      }, `${$.selectedSignature}/${$.totalSignatures}`)
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
    visible: true
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
    visible: true
  }

a.hide = () => ({ label: '', visible: false, row: 0 })

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
