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
    d: 'M4 11a9 9 0 0 1 9 9',
}),
h('path', {
    d: 'M4 4a16 16 0 0 1 16 16',
}),
h('circle', {
    cx: '5',
    cy: '19',
    r: '1',
})
])