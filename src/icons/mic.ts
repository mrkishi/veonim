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
    d: 'M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z',
}),
h('path', {
    d: 'M19 10v2a7 7 0 0 1-14 0v-2',
}),
h('line', {
    x1: '12',
    y1: '19',
    x2: '12',
    y2: '23',
}),
h('line', {
    x1: '8',
    y1: '23',
    x2: '16',
    y2: '23',
})
])