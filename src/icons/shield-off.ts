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
    d: 'M19.69 14a6.9 6.9 0 0 0 .31-2V5l-8-3-3.16 1.18',
}),
h('path', {
    d: 'M4.73 4.73L4 5v7c0 6 8 10 8 10a20.29 20.29 0 0 0 5.62-4.38',
}),
h('line', {
    x1: '1',
    y1: '1',
    x2: '23',
    y2: '23',
})
])