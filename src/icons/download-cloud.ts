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
h('polyline', {
    points: '8 17 12 21 16 17',
}),
h('line', {
    x1: '12',
    y1: '12',
    x2: '12',
    y2: '21',
}),
h('path', {
    d: 'M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29',
})
])