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
h('ellipse', {
    cx: '12',
    cy: '5',
    rx: '9',
    ry: '3',
}),
h('path', {
    d: 'M21 12c0 1.66-4 3-9 3s-9-1.34-9-3',
}),
h('path', {
    d: 'M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5',
})
])