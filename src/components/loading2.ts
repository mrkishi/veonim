import * as canvasContainer from '../core/canvas-container'
import Icon from '../components/icon2'
import { h } from '../ui/coffee'

export interface LoaderParams {
  size?: number,
  color?: string,
}

export default ({ color, size = canvasContainer.font.size + 2 } = {} as LoaderParams) => h('div', {
  style: {
    wut: console.warn('size:', size),
    color: color || 'rgba(255, 255, 255, 0.3)',
    animation: 'spin 2.5s linear infinite',
    height: `${size}px`,
    width: `${size}px`,
  }
}, [
  Icon('loader', { size })
])

