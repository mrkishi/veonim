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
    cx: '12',
    cy: '12',
    r: '4',
}),
h('line', {
    x1: '1.05',
    y1: '12',
    x2: '7',
    y2: '12',
}),
h('line', {
    x1: '17.01',
    y1: '12',
    x2: '22.96',
    y2: '12',
})
])