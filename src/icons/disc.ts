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
  h('circle', { cx: 12, cy: 12, r: 10 }),
  h('circle', { cx: 12, cy: 12, r: 3 })
])
