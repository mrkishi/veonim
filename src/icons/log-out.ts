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
    d: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4',
}),
h('polyline', {
    points: '16 17 21 12 16 7',
}),
h('line', {
    x1: '21',
    y1: '12',
    x2: '9',
    y2: '12',
})
])