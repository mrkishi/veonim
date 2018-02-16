import * as canvasContainer from '../core/canvas-container'
import { connect } from '../state/trade-federation'
import { bold, faded, paddingVH } from '../ui/css'
import { activeWindow } from '../core/windows'
import Overlay from '../components/overlay2'
import { Hint } from '../state/s-hint'
import { h } from '../ui/coffee'
import $$ from '../core/state'

const docs = (data: string) => h('div', {
  style: {
    overflow: 'visible',
    whiteSpace: 'normal',
    ...paddingVH(8, 6),
    fontSize: `${canvasContainer.font.size - 2}px`,
    color: 'var(--foreground-40)',
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
        render: $.totalSignatures > 1,
        style: {
          paddingLeft: '4px',
          color: 'var(--foreground)',
        },
      }, `${$.selectedSignature}/${$.totalSignatures}`)
    ])
  ])

])

export default connect(s => ({ data: s.hint }))(view)
