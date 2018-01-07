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
    d: 'M22.08 9C19.81 1.41 16.54-.35 9 1.92S-.35 7.46 1.92 15 7.46 24.35 15 22.08 24.35 16.54 22.08 9z',
}),
h('line', {
    x1: '12.57',
    y1: '5.99',
    x2: '16.15',
    y2: '16.39',
}),
h('line', {
    x1: '7.85',
    y1: '7.61',
    x2: '11.43',
    y2: '18.01',
}),
h('line', {
    x1: '16.39',
    y1: '7.85',
    x2: '5.99',
    y2: '11.43',
}),
h('line', {
    x1: '18.01',
    y1: '12.57',
    x2: '7.61',
    y2: '16.15',
})
])