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
    cy: '12',
    r: '10',
}),
h('line', {
    x1: '15',
    y1: '9',
    x2: '9',
    y2: '15',
}),
h('line', {
    x1: '9',
    y1: '9',
    x2: '15',
    y2: '15',
})
])