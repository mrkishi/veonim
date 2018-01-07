import { h } from '../ui/uikit'

export default ({ size = 24, color = 'currentColor', weight = 2 }) => h('svg', {
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: color,
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
  'stroke-width': weight + '',
}, [
h('rect', {
    x: '5',
    y: '2',
    width: '14',
    height: '20',
    rx: '2',
    ry: '2',
}),
h('line', {
    x1: '12',
    y1: '18',
    x2: '12',
    y2: '18',
})
])