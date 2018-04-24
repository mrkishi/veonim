import { showCursor, hideCursor } from '../core/cursor'
import { specs as titleSpecs } from '../core/title'
import { merge } from '../support/utils'
import * as dispatch from '../messaging/dispatch'
import * as viminput from '../core/input'
import huu from 'huu'
import { h as hs } from 'hyperapp'
export { app } from 'hyperapp'
export const h = huu(hs)
export const style = require('picostyle')

export interface ActionCaller { [index: string]: (data?: any) => void }
export interface Actions<T> { [index: string]: (state: T, actions: ActionCaller, data: any) => any }
export interface Events<T> { [index: string]: (state: T, actions: ActionCaller, data: any) => any }

const hostElement = document.getElementById('plugins') as HTMLElement
const hostElement2 = document.getElementById('plugins2') as HTMLElement

merge(hostElement.style, {
  position: 'absolute',
  display: 'flex',
  width: '100vw',
  zIndex: 420, // vape naysh yall
  // TODO: 24px for statusline. do it better
  // TODO: and title. bruv do i even know css?
  height: `calc(100vh - 24px - ${titleSpecs.height}px)`,
})

// TODO: this needs to go
merge(hostElement2.style, {
  position: 'absolute',
  display: 'flex',
  width: '100vw',
  zIndex: 420, // vape naysh yall
  // TODO: 24px for statusline. do it better
  // TODO: and title. bruv do i even know css?
  height: `calc(100vh - 24px - ${titleSpecs.height}px)`,
})

dispatch.sub('window.change', () => {
  hostElement.style.height = `calc(100vh - 24px - ${titleSpecs.height}px)`
})

export const vimFocus = () => {
  setImmediate(() => viminput.focus())
  showCursor()
}

export const vimBlur = () => {
  viminput.blur()
  hideCursor()
}
