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
    x: '3',
    y: '3',
    width: '18',
    height: '18',
    rx: '2',
    ry: '2',
}),
h('line', {
    x1: '12',
    y1: '8',
    x2: '12',
    y2: '16',
}),
h('line', {
    x1: '8',
    y1: '12',
    x2: '16',
    y2: '12',
})
])