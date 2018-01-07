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
    points: '10 15 15 20 20 15',
}),
h('path', {
    d: 'M4 4h7a4 4 0 0 1 4 4v12',
})
])