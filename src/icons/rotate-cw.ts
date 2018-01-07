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
    points: '23 4 23 10 17 10',
}),
h('path', {
    d: 'M20.49 15a9 9 0 1 1-2.12-9.36L23 10',
})
])