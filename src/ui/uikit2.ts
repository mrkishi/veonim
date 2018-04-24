import { showCursor, hideCursor } from '../core/cursor'
import { Component as ReactComponent } from 'react'
import hyperscript from '../ui/hyperscript'
import * as viminput from '../core/input'
import sct from 'styled-components-ts'
import { createStore } from 'redux'
import sc from 'styled-components'

// TODO: this is hack to make redux-devtools work with redux 4.0+
const reduxModule = require('redux')
reduxModule.__DO_NOT_USE__ActionTypes.INIT = '@@redux/INIT'
reduxModule.__DO_NOT_USE__ActionTypes.REPLACE = '@@redux/REPLACE'
// end dirty hack because javascript is a meme

let reactModule = 'react/umd/react.production.min'
let reactDomModule = 'react-dom/umd/react-dom.production.min.js'
let reduxEnhancer = (_: string): any => () => {}

if (process.env.VEONIM_DEV || process.env.NODE_ENV === 'test') {
  reactModule = 'react'
  reactDomModule = 'react-dom'
  reduxEnhancer = (name: string) => {
    if (process.env.NODE_ENV === 'test') return () => {}

    return (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
      && (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({ name })
  }
}

// const React = require(reactModule)
// const ReactDom = require(reactDomModule)
// TODO: temp temp temp TEMP
export const React = require(reactModule)
export const ReactDom = require(reactDomModule)
// remove above when done messing around

export const renderDom = (vNode: any, element: HTMLElement) => ReactDom.render(vNode, element)
export const h = hyperscript(React.createElement)
export const Component = React.Component
export const styled = sc
export const s = sct

export const vimFocus = () => {
  setImmediate(() => viminput.focus())
  showCursor()
}

export const vimBlur = () => {
  viminput.blur()
  hideCursor()
}

export interface App<StateT, ActionT> {
  name: string,
  state: StateT,
  view: (state: StateT, actions: { [K in keyof ActionT]: (data?: any) => void }) => ReactComponent,
  actions: { [K in keyof ActionT]: (state: StateT, data?: any) => void },
  element?: HTMLElement,
}

const pluginsDiv = document.getElementById('plugins') as HTMLElement

const prepareContainerElement = (name: string) => {
  const el = document.createElement('div')
  el.setAttribute('id', name)
  pluginsDiv.appendChild(el)
  return el
}

export const app = <StateT, ActionT>({
  state,
  view,
  actions,
  element,
  name,
}: App<StateT, ActionT>) => {
  const containerElement = element || prepareContainerElement(name)

  const deriveNextState = (currentState = state, action = {} as any) => {
    const maybeFn = Reflect.get(actions, action.type)
    if (typeof maybeFn !== 'function') return currentState

    const actionResult = maybeFn(currentState, action.data)
    return { ...<any>currentState, ...actionResult }
  }

  const dispatchRegisteredAction = (target: object, actionName: PropertyKey) => {
    const hasAction = Reflect.has(target, actionName)
    if (!hasAction) return
    return (data: any) => store.dispatch({ type: actionName, data })
  }

  type CallableActions = { [K in keyof ActionT]: (data?: any) => void }

  const callAction = new Proxy(actions, { get: dispatchRegisteredAction }) as CallableActions
  const store = createStore(deriveNextState, reduxEnhancer(name)())

  ReactDom.render(view(state, callAction), containerElement)

  store.subscribe(() => {
    const nextState = store.getState()
    ReactDom.render(view(nextState, callAction), containerElement)
  })

  return callAction
}
