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
    points: '7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2',
}),
h('line', {
    x1: '12',
    y1: '8',
    x2: '12',
    y2: '12',
}),
h('line', {
    x1: '12',
    y1: '16',
    x2: '12',
    y2: '16',
})
])