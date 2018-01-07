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
    x1: '4',
    y1: '9',
    x2: '20',
    y2: '9',
}),
h('line', {
    x1: '4',
    y1: '15',
    x2: '20',
    y2: '15',
}),
h('line', {
    x1: '10',
    y1: '3',
    x2: '8',
    y2: '21',
}),
h('line', {
    x1: '16',
    y1: '3',
    x2: '14',
    y2: '21',
})
])