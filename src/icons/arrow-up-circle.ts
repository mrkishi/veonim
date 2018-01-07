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
    points: '16 12 12 8 8 12',
}),
h('line', {
    x1: '12',
    y1: '16',
    x2: '12',
    y2: '8',
})
])