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
    cx: '5.5',
    cy: '11.5',
    r: '4.5',
}),
h('circle', {
    cx: '18.5',
    cy: '11.5',
    r: '4.5',
}),
h('line', {
    x1: '5.5',
    y1: '16',
    x2: '18.5',
    y2: '16',
})
])