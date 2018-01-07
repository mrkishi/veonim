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
    d: 'M18.36 6.64a9 9 0 1 1-12.73 0',
}),
h('line', {
    x1: '12',
    y1: '2',
    x2: '12',
    y2: '12',
})
])