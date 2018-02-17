import { connect } from '../state/trade-federation'
import * as dispatch from '../messaging/dispatch'
const { ChromePicker } = require('react-color')
import { debounce } from '../support/utils'
import { h } from '../ui/coffee'

export interface ColorPickerProps {
  color: string,
  visible: boolean,
}

const view = ({ color, visible }: ColorPickerProps) => h(ChromePicker, {
  color,
  render: visible,
  onChangeComplete: (color: any) => dispatch.pub('colorpicker.complete', color.hex),
  onChange: debounce((color: any) => dispatch.pub('colorpicker.change', color.hex), 50),
})

export default connect(s => ({ data: s.colorPicker }))(view)
