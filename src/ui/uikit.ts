import { app as makeApp, h as makeHyperscript, ActionsType, View } from 'hyperapp'
import { showCursor, hideCursor } from '../core/cursor'
import { specs as titleSpecs } from '../core/title'
import * as devtools from 'hyperapp-redux-devtools'
import * as dispatch from '../messaging/dispatch'
import hyperscript from '../ui/hyperscript'
import * as viminput from '../core/input'
import { merge } from '../support/utils'

export const h = hyperscript(makeHyperscript)

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
  merge(el.style, {
    position: 'absolute',
    width: '100%',
    height: '100%',
  })

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
export const app = <StateT, ActionsT>({ state, actions, view, element, name }: App<StateT, ActionsT>): ActionsT => {
  const containerElement = element || prepareContainerElement(name)

  return process.env.VEONIM_DEV
    ? devtools(makeApp, { name })(state, actions, view, containerElement)
    : makeApp(state, actions, view, containerElement)
}
