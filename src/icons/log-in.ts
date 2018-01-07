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
    d: 'M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4',
}),
h('polyline', {
    points: '10 17 15 12 10 7',
}),
h('line', {
    x1: '15',
    y1: '12',
    x2: '3',
    y2: '12',
})
])