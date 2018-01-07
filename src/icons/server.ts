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
    height: '8',
    rx: '2',
    ry: '2',
}),
h('rect', {
    x: '2',
    y: '14',
    width: '20',
    height: '8',
    rx: '2',
    ry: '2',
}),
h('line', {
    x1: '6',
    y1: '6',
    x2: '6',
    y2: '6',
}),
h('line', {
    x1: '6',
    y1: '18',
    x2: '6',
    y2: '18',
})
])