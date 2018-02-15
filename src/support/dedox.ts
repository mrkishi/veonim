import { createStore, Action } from 'redux'
import produce from 'immer'

export interface DedoxAction extends Action {
  data: any,
}

export type DedoxReducer = <T>(state: T, data?: any) => T

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

  const go = new Proxy({}, {
    get: (_, type) => (data: any) => store.dispatch({ type, data })
  })

  const on = new Proxy({}, {
    get: (_, name: string) => (fn: DedoxReducer) => actions.set(name, produce(fn))
  })

  return { store, onStateChange, getReducer, go, on }
}
