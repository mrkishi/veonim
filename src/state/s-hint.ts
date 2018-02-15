import { on } from '../state/trade-federation'

export interface Hint {
  label: string,
  labelStart: string,
  labelEnd: string,
  currentParam: string,
  documentation: string,
  paramDoc: string,
  anchorBottom: boolean,
  totalSignatures: number,
  selectedSignature: number,
  visible: boolean,
  row: number,
  col: number,
}

const state: Hint = {
  label: '',
  labelStart: '',
  labelEnd: '',
  currentParam: '',
  documentation: '',
  paramDoc: '',
  anchorBottom: true,
  totalSignatures: 0,
  selectedSignature: 0,
  visible: false,
  row: 0,
  col: 0,
}

export default state
export type ActionTypes = 'showHint' | 'hideHint'

on.showHint((s, label) => s.hint = {
  ...s.hint,
  label,
  visible: true,
  row: 0,
  col: 0,
})

on.hideHint(s => s.hint.visible = false)
