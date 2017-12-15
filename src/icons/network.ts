import { h } from '../ui/uikit'

export default ({ size = 24, color = 'currentColor' }) => h('svg', {
  xmlns: 'http://www.w3.org/2000/svg',
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: color,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  strokeWidth: '2',
}, [
  h('circle', { cx: '18', cy: '5', r: '3' }),
  h('circle', { cx: '6', cy: '12', r: '3' }),
  h('circle', { cx: '18', cy: '19', r: '3' }),
  h('line', {  x1: '8.59', y1: '13.51', x2: '15.42', y2: '17.49' }),
  h('line', {  x1: '15.41', y1: '6.51', x2: '8.59', y2: '10.49' }),
])
