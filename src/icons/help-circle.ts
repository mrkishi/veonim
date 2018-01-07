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
h('path', {
    d: 'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3',
}),
h('circle', {
    cx: '12',
    cy: '12',
    r: '10',
}),
h('line', {
    x1: '12',
    y1: '17',
    x2: '12',
    y2: '17',
})
])