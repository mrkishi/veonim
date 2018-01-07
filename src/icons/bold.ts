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
    d: 'M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z',
}),
h('path', {
    d: 'M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z',
})
])