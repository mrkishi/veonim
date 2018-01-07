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
    d: 'M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2',
}),
h('circle', {
    cx: '8.5',
    cy: '7',
    r: '4',
}),
h('line', {
    x1: '20',
    y1: '8',
    x2: '20',
    y2: '14',
}),
h('line', {
    x1: '23',
    y1: '11',
    x2: '17',
    y2: '11',
})
])