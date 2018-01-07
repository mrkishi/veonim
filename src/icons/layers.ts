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
h('polygon', {
    points: '12 2 2 7 12 12 22 7 12 2',
}),
h('polyline', {
    points: '2 17 12 22 22 17',
}),
h('polyline', {
    points: '2 12 12 17 22 12',
})
])