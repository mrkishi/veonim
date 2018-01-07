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
    points: '11 5 6 9 2 9 2 15 6 15 11 19 11 5',
}),
h('line', {
    x1: '23',
    y1: '9',
    x2: '17',
    y2: '15',
}),
h('line', {
    x1: '17',
    y1: '9',
    x2: '23',
    y2: '15',
})
])