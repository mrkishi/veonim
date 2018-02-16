import { connect } from '../state/trade-federation'
import { font } from '../core/canvas-container'
import Overlay from '../components/overlay2'
import { Hover } from '../state/s-hover'
import { paddingVH } from '../ui/css'
import { h } from '../ui/coffee'

const docs = (data: string) => h('div', {
  style: {
    ...paddingVH(8, 6),
    overflow: 'visible',
    whiteSpace: 'normal',
    background: 'var(--background-45)',
    color: 'var(--foreground-40)',
    fontSize: `${font.size - 2}px`,
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
      background: 'var(--background-30)',
      padding: '8px',
    }
  }, $.value.map(m => h('div', {
    style: {
      display: 'flex',
      flexFlow: 'row wrap',
    }
  }, m.map(({ color, text }) => h('span', {
    style: {
      color: color || 'var(--foreground)',
      whiteSpace: 'pre',
    }
  }, text)))))

  ,$.doc && $.anchorBottom && docs($.doc)

])

export default connect(s => ({ data: s.hover }))(view)
