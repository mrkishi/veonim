import federation from '../state/trade-federation'

const on = federation.on

on.showHint((s, label) => s.hint = {
  label,
  visible: true,
  row: 0,
  col: 0,
})

on.hideHint(s => s.hint.visible = false)
