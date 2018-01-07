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
    d: 'M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z',
}),
h('line', {
    x1: '16',
    y1: '8',
    x2: '2',
    y2: '22',
}),
h('line', {
    x1: '17',
    y1: '15',
    x2: '9',
    y2: '15',
})
])