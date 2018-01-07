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
    x: '1',
    y: '4',
    width: '22',
    height: '16',
    rx: '2',
    ry: '2',
}),
h('line', {
    x1: '1',
    y1: '10',
    x2: '23',
    y2: '10',
})
])