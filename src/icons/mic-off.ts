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
    x1: '1',
    y1: '1',
    x2: '23',
    y2: '23',
}),
h('path', {
    d: 'M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6',
}),
h('path', {
    d: 'M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23',
}),
h('line', {
    x1: '12',
    y1: '19',
    x2: '12',
    y2: '23',
}),
h('line', {
    x1: '8',
    y1: '23',
    x2: '16',
    y2: '23',
})
])