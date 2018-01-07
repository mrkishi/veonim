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
    r: '10',
}),
h('line', {
    x1: '14.31',
    y1: '8',
    x2: '20.05',
    y2: '17.94',
}),
h('line', {
    x1: '9.69',
    y1: '8',
    x2: '21.17',
    y2: '8',
}),
h('line', {
    x1: '7.38',
    y1: '12',
    x2: '13.12',
    y2: '2.06',
}),
h('line', {
    x1: '9.69',
    y1: '16',
    x2: '3.95',
    y2: '6.06',
}),
h('line', {
    x1: '14.31',
    y1: '16',
    x2: '2.83',
    y2: '16',
}),
h('line', {
    x1: '16.62',
    y1: '12',
    x2: '10.88',
    y2: '21.94',
})
])