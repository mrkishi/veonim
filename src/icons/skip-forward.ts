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
    points: '5 4 15 12 5 20 5 4',
}),
h('line', {
    x1: '19',
    y1: '5',
    x2: '19',
    y2: '19',
})
])