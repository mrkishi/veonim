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
    cx: '18',
    cy: '18',
    r: '3',
}),
h('circle', {
    cx: '6',
    cy: '6',
    r: '3',
}),
h('path', {
    d: 'M13 6h3a2 2 0 0 1 2 2v7',
}),
h('line', {
    x1: '6',
    y1: '9',
    x2: '6',
    y2: '21',
})
])