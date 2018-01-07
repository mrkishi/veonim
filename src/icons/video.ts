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
h('polygon', {
    points: '23 7 16 12 23 17 23 7',
}),
h('rect', {
    x: '1',
    y: '5',
    width: '15',
    height: '14',
    rx: '2',
    ry: '2',
})
])