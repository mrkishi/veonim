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
    x: '4',
    y: '4',
    width: '16',
    height: '16',
    rx: '2',
    ry: '2',
}),
h('rect', {
    x: '9',
    y: '9',
    width: '6',
    height: '6',
}),
h('line', {
    x1: '9',
    y1: '1',
    x2: '9',
    y2: '4',
}),
h('line', {
    x1: '15',
    y1: '1',
    x2: '15',
    y2: '4',
}),
h('line', {
    x1: '9',
    y1: '20',
    x2: '9',
    y2: '23',
}),
h('line', {
    x1: '15',
    y1: '20',
    x2: '15',
    y2: '23',
}),
h('line', {
    x1: '20',
    y1: '9',
    x2: '23',
    y2: '9',
}),
h('line', {
    x1: '20',
    y1: '14',
    x2: '23',
    y2: '14',
}),
h('line', {
    x1: '1',
    y1: '9',
    x2: '4',
    y2: '9',
}),
h('line', {
    x1: '1',
    y1: '14',
    x2: '4',
    y2: '14',
})
])