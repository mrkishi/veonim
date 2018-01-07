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
    d: 'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z',
}),
h('path', {
    d: 'M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z',
})
])