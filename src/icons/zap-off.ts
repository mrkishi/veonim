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
    points: '12.41 6.75 13 2 10.57 4.92',
}),
h('polyline', {
    points: '18.57 12.91 21 10 15.66 10',
}),
h('polyline', {
    points: '8 8 3 14 12 14 11 22 16 16',
}),
h('line', {
    x1: '1',
    y1: '1',
    x2: '23',
    y2: '23',
})
])