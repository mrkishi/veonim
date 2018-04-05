import hyperscript from '../ui/hyperscript'
import sct from 'styled-components-ts'
import { createStore } from 'redux'
import sc from 'styled-components'
import { Component } from 'react'

let reactModule = 'react/umd/react.production.min'
let reactDomModule = 'react-dom/umd/react-dom.production.min.js'
let devToolsEnhancerMaybe: any = undefined

if (process.env.VEONIM_DEV || process.env.NODE_ENV === 'test') {
  reactModule = 'react'
  reactDomModule = 'react-dom'
  devToolsEnhancerMaybe = (window as any).__REDUX_DEVTOOLS_EXTENSION__
    && (window as any).__REDUX_DEVTOOLS_EXTENSION__()
}

const ReactDom = require(reactDomModule)
export const React = require(reactModule)
export const h = hyperscript(React.createElement)
export const styled = sc
export const s = sct

export interface App<StateT, ActionT> {
  state: StateT,
  view: (state: StateT, actions: { [K in keyof ActionT]: (data?: any) => void }) => Component,
  actions: { [K in keyof ActionT]: (state: StateT, data?: any) => void },
  element?: HTMLElement,
}

export const app = <StateT, ActionT>({ state, view, actions, element = document.body }: App<StateT, ActionT>) => {
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
  const store = createStore(deriveNextState, devToolsEnhancerMaybe)

  ReactDom.render(view(state, callAction), element)

  store.subscribe(() => {
    const nextState = store.getState()
    ReactDom.render(view(nextState, callAction), element)
  })

  return callAction
}
