import { connect as connectToStore } from 'react-redux'
import { createStore, Action } from 'redux'

export interface App {
  state: object,
  view: Function,
  actions: object,
  element?: HTMLElement,
}

let reactModule = 'react/umd/react.production.min'
let reactDomModule = 'react-dom/umd/react-dom.production.min.js'
let devToolsEnhancerMaybe: any = undefined

if (process.env.VEONIM_DEV) {
  reactModule = 'react'
  reactDomModule = 'react-dom'
  devToolsEnhancerMaybe = (window as any).__REDUX_DEVTOOLS_EXTENSION__
    && (window as any).__REDUX_DEVTOOLS_EXTENSION__()
}

export const React = require(reactModule)
const ReactDom = require(reactDomModule)

export const app = ({ state, view, actions, element = document.body }: App) => {
  const deriveNextState = (currentState = state, action = {} as any) => {
    const maybeFn = Reflect.get(actions, action.type)
    if (typeof maybeFn !== 'function') return currentState
    const actionResult = maybeFn(currentState, action.data)
    return { ...currentState, ...actionResult }
  }

  const dispatchRegisteredAction = (target: App['actions'], actionName: PropertyKey) => {
    const hasAction = Reflect.has(target, actionName)
    if (!hasAction) throw new Error(`action function ${actionName} is not defined on actions object ${target}`)

    return (data: any) => store.dispatch({ type: actionName, data })
  }

  const store = createStore(deriveNextState, devToolsEnhancerMaybe)
  ReactDom.render(view, element)
  return new Proxy(actions, { get: dispatchRegisteredAction })
}
