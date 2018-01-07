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
h('polygon', {
    points: '14 2 18 6 7 17 3 17 3 13 14 2',
}),
h('line', {
    x1: '3',
    y1: '22',
    x2: '21',
    y2: '22',
})
])