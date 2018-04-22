import { ProblemInfo } from '../state/problem-info'
import { connect } from '../state/trade-federation'
import Overlay from '../components/overlay2'
import Icon from '../components/icon2'
import { h } from '../ui/uikit2'
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
      Icon('XCircle', {
        color: cvar('error'),
        size: '1.2rem',
      })
    ])

    ,h('div', $.value)

  ])

])

export default connect(s => ({ data: s.problemInfo }))(view)
