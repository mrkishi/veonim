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
    cx: '6',
    cy: '6',
    r: '3',
}),
h('circle', {
    cx: '6',
    cy: '18',
    r: '3',
}),
h('line', {
    x1: '20',
    y1: '4',
    x2: '8.12',
    y2: '15.88',
}),
h('line', {
    x1: '14.47',
    y1: '14.48',
    x2: '20',
    y2: '20',
}),
h('line', {
    x1: '8.12',
    y1: '8.12',
    x2: '12',
    y2: '12',
})
])