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
    points: '15 3 21 3 21 9',
}),
h('polyline', {
    points: '9 21 3 21 3 15',
}),
h('line', {
    x1: '21',
    y1: '3',
    x2: '14',
    y2: '10',
}),
h('line', {
    x1: '3',
    y1: '21',
    x2: '10',
    y2: '14',
})
])