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
    points: '4 7 4 4 20 4 20 7',
}),
h('line', {
    x1: '9',
    y1: '20',
    x2: '15',
    y2: '20',
}),
h('line', {
    x1: '12',
    y1: '4',
    x2: '12',
    y2: '20',
})
])