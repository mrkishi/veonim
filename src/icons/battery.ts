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
    x: '1',
    y: '6',
    width: '18',
    height: '12',
    rx: '2',
    ry: '2',
}),
h('line', {
    x1: '23',
    y1: '13',
    x2: '23',
    y2: '11',
})
])