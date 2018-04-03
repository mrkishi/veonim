import { createStore } from 'redux'

export interface App<StateType extends object> {
  state: StateType & object,
  // TODO: better typings here pls. e.g. returns react component
  view: (state: StateType, actions: object) => Function,
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

export const app = <StateType>({ state, view, actions, element = document.body }: App<StateType & object>) => {
  const deriveNextState = (currentState = state, action = {} as any) => {
    const maybeFn = Reflect.get(actions, action.type)
    if (typeof maybeFn !== 'function') return currentState

    const actionResult = maybeFn(currentState, action.data)
    return { ...<object>currentState, ...actionResult }
  }

  const dispatchRegisteredAction = (target: object, actionName: PropertyKey) => {
    const hasAction = Reflect.has(target, actionName)
    if (!hasAction) throw new Error(`action function ${actionName} is not defined on actions object ${target}`)

    return (data: any) => store.dispatch({ type: actionName, data })
  }

  const store = createStore(deriveNextState, devToolsEnhancerMaybe)
  ReactDom.render(view(state, actions), element)

  store.subscribe(() => {
    const nextState = store.getState()
    ReactDom.render(view(nextState, actions), element)
  })

  // TODO: figure out the typings to get keys of object
  // type CallableActions = { [K in keyof actions]: (data: any) => void }
  type CallableActions = { [key: string]: (data: any) => void }
  return new Proxy(actions, { get: dispatchRegisteredAction }) as CallableActions
}
