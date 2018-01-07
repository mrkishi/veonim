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
    points: '17 1 21 5 17 9',
}),
h('path', {
    d: 'M3 11V9a4 4 0 0 1 4-4h14',
}),
h('polyline', {
    points: '7 23 3 19 7 15',
}),
h('path', {
    d: 'M21 13v2a4 4 0 0 1-4 4H3',
})
])