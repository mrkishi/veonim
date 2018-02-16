import { connect } from '../state/trade-federation'
import { activeWindow } from '../core/windows'
import Overlay from '../components/overlay2'
import { h, styled } from '../ui/coffee'
import { Hint } from '../state/s-hint'
import { paddingVH } from '../ui/css'
import { cvar } from '../ui/css'

const Faded = styled.span`
  color: var(--foreground);
  opacity: 0.6;
`

const Strong = styled.span`
  color: var(--foreground);
  font-weight: bold;
`

const docs = (data: string) => h('div', {
  style: {
    ...paddingVH(8, 6),
    overflow: 'visible',
    whiteSpace: 'normal',
    fontSize: '0.9rem',
    color: cvar('foreground-40'),
  }
}, data)

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
