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
    x1: '19',
    y1: '4',
    x2: '10',
    y2: '4',
}),
h('line', {
    x1: '14',
    y1: '20',
    x2: '5',
    y2: '20',
}),
h('line', {
    x1: '15',
    y1: '4',
    x2: '9',
    y2: '20',
})
])