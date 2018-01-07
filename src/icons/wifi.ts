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
    d: 'M5 12.55a11 11 0 0 1 14.08 0',
}),
h('path', {
    d: 'M1.42 9a16 16 0 0 1 21.16 0',
}),
h('path', {
    d: 'M8.53 16.11a6 6 0 0 1 6.95 0',
}),
h('line', {
    x1: '12',
    y1: '20',
    x2: '12',
    y2: '20',
})
])