import hyperscript from '../ui/hyperscript'
import sct from 'styled-components-ts'
import { createStore } from 'redux'
import sc from 'styled-components'

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

export interface App<T> {
  state: T,
  // TODO: better typings here pls. e.g. returns react component
  // need @types/react
  // TODO: how to make it such that we get completion info for actions in the view fn?
  view: (state: T, actions: object) => Function,
  actions: { [key: string]: (state: T, data?: any) => void },
  element?: HTMLElement,
}

export const app = <T>({ state, view, actions, element = document.body }: App<T & object>) => {
  const deriveNextState = (currentState = state, action = {} as any) => {
    const maybeFn = Reflect.get(actions, action.type)
    if (typeof maybeFn !== 'function') return currentState

    const actionResult = maybeFn(currentState, action.data)
    return { ...<object>currentState, ...actionResult }
  }

  const dispatchRegisteredAction = (target: object, actionName: PropertyKey) => {
    const hasAction = Reflect.has(target, actionName)
    if (!hasAction) return
    return (data: any) => store.dispatch({ type: actionName, data })
  }

  // TODO: figure out the typings to get keys of object
  // type CallableActions = { [K in keyof actions]: (data: any) => void }
  type CallableActions = { [key: string]: (data?: any) => void }
  const callAction = new Proxy(actions, { get: dispatchRegisteredAction }) as CallableActions
  const store = createStore(deriveNextState, devToolsEnhancerMaybe)

  ReactDom.render(view(state, callAction), element)

  store.subscribe(() => {
    const nextState = store.getState()
    ReactDom.render(view(nextState, callAction), element)
  })

  return callAction
}
