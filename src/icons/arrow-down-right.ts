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
    x1: '7',
    y1: '7',
    x2: '17',
    y2: '17',
}),
h('polyline', {
    points: '17 7 17 17 7 17',
})
])