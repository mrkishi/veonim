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
    d: 'M16.72 11.06A10.94 10.94 0 0 1 19 12.55',
}),
h('path', {
    d: 'M5 12.55a10.94 10.94 0 0 1 5.17-2.39',
}),
h('path', {
    d: 'M10.71 5.05A16 16 0 0 1 22.58 9',
}),
h('path', {
    d: 'M1.42 9a15.91 15.91 0 0 1 4.7-2.88',
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