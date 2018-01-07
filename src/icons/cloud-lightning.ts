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
h('path', {
    d: 'M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9',
}),
h('polyline', {
    points: '13 11 9 17 15 17 11 23',
})
])