import { connect } from '../state/trade-federation'
import { font } from '../core/canvas-container'
import Overlay from '../components/overlay2'
import { Hover } from '../state/s-hover'
import { paddingVH } from '../ui/css'
import { h } from '../ui/coffee'
import { cvar } from '../ui/css'

const docs = (data: string) => h('div', {
  style: {
    ...paddingVH(8, 6),
    overflow: 'visible',
    whiteSpace: 'normal',
    background: cvar('background-45'),
    color: cvar('foreground-40'),
    fontSize: '0.9rem',
  }
}, data)

const view = ({ data: $ }: { data: Hover }) => Overlay({
  name: 'hover2',
  x: $.x,
  y: $.y,
  maxWidth: 600,
  visible: $.visible,
  anchorAbove: $.anchorBottom,
}, [

  ,$.doc && !$.anchorBottom && docs($.doc)

  ,h('div', {
    style: {
      background: cvar('background-30'),
      padding: '8px',
    }
  }, $.value.map(m => h('div', {
    style: {
      display: 'flex',
      flexFlow: 'row wrap',
    }
  }, m.map(({ color, text }) => h('span', {
    style: {
      color: color || cvar('foreground'),
      whiteSpace: 'pre',
    }
  }, text)))))

  ,$.doc && $.anchorBottom && docs($.doc)

])

export default connect(s => ({ data: s.hover }))(view)
