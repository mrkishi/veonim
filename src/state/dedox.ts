import { RegisteredActionTypes } from '../state/trade-federation'
import { connect as connectToStore } from 'react-redux'
import { createStore, Action } from 'redux'
import produce from 'immer'

// typescript reports that 'produce is declared but never used' it clearly is
// used in the code below (DedoxRegisterAction), so i don't know what the fuck
// typescript is smoking
// typescript also reports that 'connectToStore is never used' wtf...
(() => produce);(() => connectToStore)

export interface DedoxAction extends Action {
  data: any,
}

export type DedoxReducer = <T>(state: T, data?: any) => T
export type DedoxRegisterAction<T> = { [action: string]: (actionFn: (state: T, data: any) => any) => void }
export type DedoxCallAction = { [action in RegisteredActionTypes]: (data: any) => void }
export type DedoxConnect<T> = (selector: (state: T) => any) => Function

export default <T>(initialState: T) => {
  const actions = new Map<string, Function>()

  const mainReducer = (state = initialState, action = {} as DedoxAction) => {
    const maybeFn = actions.get(action.type)
    return typeof maybeFn === 'function'
      ? maybeFn(state, action.data)
      : state
  }

  const store = createStore(mainReducer as any)
  const onStateChange = (fn: (state: T) => void) => store.subscribe(() => fn(store.getState() as T))
  const getReducer = (action: string) => actions.get(action)

  const go: DedoxCallAction = new Proxy({} as any, {
    get: (_, type) => (data: any) => store.dispatch({ type, data })
  })

  const on: DedoxRegisterAction<T> = new Proxy({}, {
    get: (_, name: string) => (fn: DedoxReducer) => actions.set(name, produce(fn))
  })

  const connect: DedoxConnect<T> = connectToStore

  return { store, onStateChange, getReducer, connect, go, on }
}
