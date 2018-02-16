import { connect } from '../state/trade-federation'
import { bold, faded, paddingVH } from '../ui/css'
import { activeWindow } from '../core/windows'
import Overlay from '../components/overlay2'
import { Hint } from '../state/s-hint'
import { h } from '../ui/coffee'
import { cvar } from '../ui/css'
import $$ from '../core/state'

const docs = (data: string) => h('div', {
  style: {
    overflow: 'visible',
    whiteSpace: 'normal',
    ...paddingVH(8, 6),
    fontSize: '0.9em',
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
        // TODO: i think we can do this with css only
        ,h('span', { style: faded($$.foreground, 0.6) }, $.labelStart)
        ,h('span', { style: bold($$.foreground) }, $.currentParam)
        ,h('span', { style: faded($$.foreground, 0.6) }, $.labelEnd)
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
