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
    r: '5',
}),
h('line', {
    x1: '12',
    y1: '1',
    x2: '12',
    y2: '3',
}),
h('line', {
    x1: '12',
    y1: '21',
    x2: '12',
    y2: '23',
}),
h('line', {
    x1: '4.22',
    y1: '4.22',
    x2: '5.64',
    y2: '5.64',
}),
h('line', {
    x1: '18.36',
    y1: '18.36',
    x2: '19.78',
    y2: '19.78',
}),
h('line', {
    x1: '1',
    y1: '12',
    x2: '3',
    y2: '12',
}),
h('line', {
    x1: '21',
    y1: '12',
    x2: '23',
    y2: '12',
}),
h('line', {
    x1: '4.22',
    y1: '19.78',
    x2: '5.64',
    y2: '18.36',
}),
h('line', {
    x1: '18.36',
    y1: '5.64',
    x2: '19.78',
    y2: '4.22',
})
])