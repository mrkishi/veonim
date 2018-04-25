import { connect } from '../state/trade-federation'
import { docStyle } from '../styles/common'
import { activeWindow } from '../core/windows'
import Overlay from '../components/overlay2'
import { h, styled } from '../ui/uikit2'
import { Hint } from '../state/hint'
import { cvar } from '../ui/css'

const Faded = styled.span`
  color: var(--foreground);
  filter: opacity(60%);
`

const Strong = styled.span`
  color: var(--foreground);
  font-weight: bold;
`

const docs = (data: string) => h('div', {
  style: docStyle,
}, [ h('div', data) ])

const view = ({ data: $ }: { data: Hint }) => Overlay({
  name: 'hint',
  x: activeWindow() ? activeWindow()!.colToX($.col - 1) : 0,
  y: activeWindow() ? activeWindow()!.rowToTransformY($.row > 2 ? $.row : $.row + 1) : 0,
  zIndex: 200,
  maxWidth: 600,
  visible: $.visible,
  anchorAbove: $.anchorBottom,
}, [

  ,h('div', {
    style: {
      background: cvar('background-30'),
    }
  }, [
    ,h('div', { style: {
      background: cvar('background-45'),
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
        ,h(Faded, [ h('span', $.labelStart) ])
        ,h(Strong, [ h('span', $.currentParam) ])
        ,h(Faded, [ h('span', $.labelEnd) ])
      ])

      ,h('div', {
        render: $.totalSignatures > 1,
        style: {
          paddingLeft: '4px',
          color: cvar('foreground'),
        },
      }, `${$.selectedSignature}/${$.totalSignatures}`)
    ])
  ])

])

export default connect(s => ({ data: s.hint }))(view)
