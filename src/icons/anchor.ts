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
h('circle', {
    cx: '12',
    cy: '5',
    r: '3',
}),
h('line', {
    x1: '12',
    y1: '22',
    x2: '12',
    y2: '8',
}),
h('path', {
    d: 'M5 12H2a10 10 0 0 0 20 0h-3',
})
])