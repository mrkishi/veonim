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
    cx: '12',
    cy: '12',
    r: '10',
}),
h('polyline', {
    points: '12 16 16 12 12 8',
}),
h('line', {
    x1: '8',
    y1: '12',
    x2: '16',
    y2: '12',
})
])