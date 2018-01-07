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
    cx: '18',
    cy: '5',
    r: '3',
}),
h('circle', {
    cx: '6',
    cy: '12',
    r: '3',
}),
h('circle', {
    cx: '18',
    cy: '19',
    r: '3',
}),
h('line', {
    x1: '8.59',
    y1: '13.51',
    x2: '15.42',
    y2: '17.49',
}),
h('line', {
    x1: '15.41',
    y1: '6.51',
    x2: '8.59',
    y2: '10.49',
})
])