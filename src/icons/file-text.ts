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
    d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z',
}),
h('polyline', {
    points: '14 2 14 8 20 8',
}),
h('line', {
    x1: '16',
    y1: '13',
    x2: '8',
    y2: '13',
}),
h('line', {
    x1: '16',
    y1: '17',
    x2: '8',
    y2: '17',
}),
h('polyline', {
    points: '10 9 9 9 8 9',
})
])