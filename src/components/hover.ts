import { connect } from '../state/trade-federation'
import { docStyle } from '../styles/common'
import Overlay from '../components/overlay2'
import { Hover } from '../state/hover'
import { h } from '../ui/uikit2'
import { cvar } from '../ui/css'

const docs = (data: string) => h('div', { style: docStyle }, [ h('div', data) ])

const view = ({ data: $ }: { data: Hover }) => Overlay({
  name: 'hover',
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
