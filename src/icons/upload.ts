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
    d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4',
}),
h('polyline', {
    points: '17 8 12 3 7 8',
}),
h('line', {
    x1: '12',
    y1: '3',
    x2: '12',
    y2: '15',
})
])