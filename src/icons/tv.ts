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
    y: '7',
    width: '20',
    height: '15',
    rx: '2',
    ry: '2',
}),
h('polyline', {
    points: '17 2 12 7 7 2',
})
])