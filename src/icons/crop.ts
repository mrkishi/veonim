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
    d: 'M6.13 1L6 16a2 2 0 0 0 2 2h15',
}),
h('path', {
    d: 'M1 6.13L16 6a2 2 0 0 1 2 2v15',
})
])