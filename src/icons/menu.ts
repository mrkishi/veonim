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
h('line', {
    x1: '3',
    y1: '12',
    x2: '21',
    y2: '12',
}),
h('line', {
    x1: '3',
    y1: '6',
    x2: '21',
    y2: '6',
}),
h('line', {
    x1: '3',
    y1: '18',
    x2: '21',
    y2: '18',
})
])