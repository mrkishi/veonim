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
    cx: '18',
    cy: '18',
    r: '3',
}),
h('circle', {
    cx: '6',
    cy: '6',
    r: '3',
}),
h('path', {
    d: 'M6 21V9a9 9 0 0 0 9 9',
})
])