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
    points: '1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6',
}),
h('line', {
    x1: '8',
    y1: '2',
    x2: '8',
    y2: '18',
}),
h('line', {
    x1: '16',
    y1: '6',
    x2: '16',
    y2: '22',
})
])