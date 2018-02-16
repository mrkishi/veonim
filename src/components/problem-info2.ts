// import * as canvasContainer from '../core/canvas-container'
import { ProblemInfo } from '../state/s-problem-info'
import { connect } from '../state/trade-federation'
import Overlay from '../components/overlay2'
import Icon from '../components/icon'
import { h } from '../ui/coffee'
import { cvar } from '../ui/css'

const view = ({ data: $ }: { data: ProblemInfo }) => Overlay({
  name: 'problem-info',
  x: $.x,
  y: $.y,
  maxWidth: 600,
  visible: $.visible,
  anchorAbove: $.anchorBottom,
}, [

  ,h('div', {
    style: {
      background: cvar('background-30'),
      color: cvar('foreground'),
      padding: '8px',
      display: 'flex',
      alignItems: 'center',
    }
  }, [

    ,h('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        paddingRight: '8px',
      }
    }, [
      // Icon('error', {
      //   color: cvar('error'),
      //   size: `1.2rem`,
      //   // TODO: use em/rem pls
      //   // size: canvasContainer.font.size + 4,
      // })
    ])

    ,h('div', $.value)

  ])

])

export default connect(s => ({ data: s.problemInfo }))(view)
