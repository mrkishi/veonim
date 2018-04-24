import { connect, go } from '../state/trade-federation'
import { ColorPicker } from '../state/color-picker'
import * as dispatch from '../messaging/dispatch'
const { ChromePicker } = require('react-color')
import Overlay from '../components/overlay2'
import { throttle } from '../support/utils'
import onLoseFocus from '../ui/lose-focus'
import { h, styled } from '../ui/uikit2'

export interface ColorPickerProps {
  color: string,
  visible: boolean,
}

// const view = ({ data: $ }: { data: ColorPicker }) => Overlay({
//   name: 'color-picker',
//   x: $.x,
//   y: $.y,
//   visible: $.visible,
//   anchorAbove: $.anchorBottom,
//   onElement: el => el && onLoseFocus(el, go.hideColorPicker),
// }, [

//   ,h('.show-cursor', [
//     ,h(ChromePicker, {
//       color: $.color,
//       onChangeComplete: (color: any) => dispatch.pub('colorpicker.complete', color.hex),
//       onChange: throttle((color: any) => dispatch.pub('colorpicker.change', color.hex), 150),
//     })
//   ])

// ])

// export default connect(s => ({ data: s.colorPicker }))(view)
