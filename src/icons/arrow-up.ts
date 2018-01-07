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
h('line', {
    x1: '12',
    y1: '19',
    x2: '12',
    y2: '5',
}),
h('polyline', {
    points: '5 12 12 5 19 12',
})
])