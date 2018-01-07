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
    d: 'M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25',
}),
h('line', {
    x1: '8',
    y1: '16',
    x2: '8',
    y2: '16',
}),
h('line', {
    x1: '8',
    y1: '20',
    x2: '8',
    y2: '20',
}),
h('line', {
    x1: '12',
    y1: '18',
    x2: '12',
    y2: '18',
}),
h('line', {
    x1: '12',
    y1: '22',
    x2: '12',
    y2: '22',
}),
h('line', {
    x1: '16',
    y1: '16',
    x2: '16',
    y2: '16',
}),
h('line', {
    x1: '16',
    y1: '20',
    x2: '16',
    y2: '20',
})
])