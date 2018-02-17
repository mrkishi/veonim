import { RegisteredActions } from '../state/trade-federation'
import { connect as connectToStore } from 'react-redux'
import { createStore, Action } from 'redux'
import produce from 'immer'

export interface DedoxAction extends Action {
  data: any,
}

type AnyCallable = { [name: string]: (...args: any[]) => void }
export type DedoxCallableAction = RegisteredActions & AnyCallable
export type DedoxReducer = <T>(state: T, data?: any) => T
export type DedoxRegisterAction<T> = { [action: string]: (actionFn: (state: T, data: any) => any) => void }
export type DedoxConnect<T> = (selector: (state: T) => any) => Function

export default <T>(initialState: T) => {
  const actions = new Map<string, Function>()

  const mainReducer = (state = initialState, action = {} as DedoxAction) => {
    const maybeFn = actions.get(action.type)
    return typeof maybeFn === 'function'
      ? maybeFn(state, action.data)
      : state
  }

  let arg2 = undefined
  if (process.env.VEONIM_DEV) {
    arg2 = (window as any).__REDUX_DEVTOOLS_EXTENSION__
      && (window as any).__REDUX_DEVTOOLS_EXTENSION__()
  }

  const store = createStore(mainReducer as any, arg2)
  const onStateChange = (fn: (state: T) => void) => store.subscribe(() => fn(store.getState() as T))
  const getReducer = (action: string) => actions.get(action)

  const go: DedoxCallableAction = new Proxy({} as any, {
    get: (_, type) => (data: any) => store.dispatch({ type, data })
  })

  const on: DedoxRegisterAction<T> = new Proxy({}, {
    get: (_, name: string) => (fn: DedoxReducer) => actions.set(name, produce(fn))
  })

  const connect: DedoxConnect<T> = connectToStore
  const getState = () => store.getState() as T

  return { store, onStateChange, getReducer, connect, go, on, getState }
}
