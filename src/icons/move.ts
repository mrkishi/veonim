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
    points: '5 9 2 12 5 15',
}),
h('polyline', {
    points: '9 5 12 2 15 5',
}),
h('polyline', {
    points: '15 19 12 22 9 19',
}),
h('polyline', {
    points: '19 9 22 12 19 15',
}),
h('line', {
    x1: '2',
    y1: '12',
    x2: '22',
    y2: '12',
}),
h('line', {
    x1: '12',
    y1: '2',
    x2: '12',
    y2: '22',
})
])