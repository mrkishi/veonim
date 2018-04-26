import { app as makeApp, h as makeHyperscript, ActionsType, View } from 'hyperapp'
import { showCursor, hideCursor } from '../core/cursor'
import { specs as titleSpecs } from '../core/title'
import * as devtools from 'hyperapp-redux-devtools'
import * as dispatch from '../messaging/dispatch'
import hyperscript from '../ui/hyperscript'
import * as viminput from '../core/input'
import { merge } from '../support/utils'

export const h = hyperscript(makeHyperscript)

// TODO: this is rubbish.
export const style = require('picostyle')
export interface ActionCaller { [index: string]: (data?: any) => void }
export interface Actions<T> { [index: string]: (state: T, actions: ActionCaller, data: any) => any }
export interface Events<T> { [index: string]: (state: T, actions: ActionCaller, data: any) => any }
const hostElement2 = document.getElementById('plugins2') as HTMLElement
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


const hostElement = document.getElementById('plugins') as HTMLElement
merge(hostElement.style, {
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

const pluginsDiv = document.getElementById('plugins') as HTMLElement

const prepareContainerElement = (name: string) => {
  const el = document.createElement('div')
  el.setAttribute('id', name)
  pluginsDiv.appendChild(el)
  return el
}

export interface App<StateT, ActionsT> {
  name: string,
  state: StateT,
  actions: ActionsType<StateT, ActionsT>,
  view: View<StateT, ActionsT>,
  element?: HTMLElement,
}

/** create app for cultural learnings of hyperapp for make benefit of glorious application veonim */
export const app = <StateT, ActionT>({ state, actions, view, element, name }: App<StateT, ActionT>): ActionT => {
  const containerElement = element || prepareContainerElement(name)
  const theApp = makeApp(state, actions, view, containerElement)

  return process.env.VEONIM_DEV
    // TODO: the name kind sir. we needs it to go here. use MAH FORK
    ? devtools(theApp)
    : theApp
}
