import { go, connect } from '../state/trade-federation'
const { ChromePicker } = require('react-color')
import { debounce } from '../support/utils'
import { h } from '../ui/coffee'

export interface ColorPickerProps {
  color: string,
  visible: boolean,
}

const view = ({ color, visible }: ColorPickerProps) => h(ChromePicker, {
  color,
  onChange: debounce(go.colorPickerChange, 50),
  onChangeComplete: go.colorPicked,
  render: visible,
})

export default connect(s => ({ data: s.colorPicker }))(view)


// a.hide = () => {
//   if (pickedColor) cmd(`exec "normal! ciw${pickedColor}"`)
//   return { val: '#ffffff', vis: false }
// }

// action('pick-color', async () => {
//   const word = await call.expand('<cword>')
//   ui.show(word)
// })
