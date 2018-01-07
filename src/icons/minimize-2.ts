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
    points: '4 14 10 14 10 20',
}),
h('polyline', {
    points: '20 10 14 10 14 4',
}),
h('line', {
    x1: '14',
    y1: '10',
    x2: '21',
    y2: '3',
}),
h('line', {
    x1: '3',
    y1: '21',
    x2: '10',
    y2: '14',
})
])