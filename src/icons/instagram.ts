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
h('rect', {
    x: '2',
    y: '2',
    width: '20',
    height: '20',
    rx: '5',
    ry: '5',
}),
h('path', {
    d: 'M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z',
}),
h('line', {
    x1: '17.5',
    y1: '6.5',
    x2: '17.5',
    y2: '6.5',
})
])