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
    d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2',
}),
h('circle', {
    cx: '12',
    cy: '7',
    r: '4',
})
])