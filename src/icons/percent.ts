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
h('line', {
    x1: '19',
    y1: '5',
    x2: '5',
    y2: '19',
}),
h('circle', {
    cx: '6.5',
    cy: '6.5',
    r: '2.5',
}),
h('circle', {
    cx: '17.5',
    cy: '17.5',
    r: '2.5',
})
])