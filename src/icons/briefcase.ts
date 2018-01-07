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
h('rect', {
    x: '2',
    y: '7',
    width: '20',
    height: '14',
    rx: '2',
    ry: '2',
}),
h('path', {
    d: 'M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16',
})
])