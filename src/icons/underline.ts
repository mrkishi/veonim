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
    d: 'M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3',
}),
h('line', {
    x1: '4',
    y1: '21',
    x2: '20',
    y2: '21',
})
])