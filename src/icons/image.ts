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
h('circle', {
    cx: '8.5',
    cy: '8.5',
    r: '1.5',
}),
h('polyline', {
    points: '21 15 16 10 5 21',
})
])