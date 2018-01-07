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
    y: '4',
    width: '18',
    height: '18',
    rx: '2',
    ry: '2',
}),
h('line', {
    x1: '16',
    y1: '2',
    x2: '16',
    y2: '6',
}),
h('line', {
    x1: '8',
    y1: '2',
    x2: '8',
    y2: '6',
}),
h('line', {
    x1: '3',
    y1: '10',
    x2: '21',
    y2: '10',
})
])