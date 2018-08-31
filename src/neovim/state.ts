import { NeovimState, state } from '../neovim/initial-state'
export { NeovimState } from '../neovim/initial-state'
import { EventEmitter } from 'events'

type StateKeys = keyof NeovimState
type WatchState = { [Key in StateKeys]: (fn: (value: NeovimState[Key]) => void) => void }
type UntilStateValue = {
  [Key in StateKeys]: {
    is: (value: NeovimState[Key]) => Promise<NeovimState[Key]>
  }
}

const watchers = new EventEmitter()
const stateChangeFns = new Set<Function>()

export const watch: WatchState = new Proxy(Object.create(null), {
  get: (_, key: string) => (fn: (value: any) => void) => watchers.on(key, fn),
})

export const onStateChange = (fn: (nextState: NeovimState, key: string, value: any) => void) => {
  stateChangeFns.add(fn)
}

export const untilStateValue: UntilStateValue = new Proxy(Object.create(null), {
  get: (_, key: string) => ({ is: (watchedValue: any) => new Promise(done => {
    const callback = (newValue: any) => {
      if (newValue === watchedValue) return
      done(newValue)
      watchers.removeListener(key, callback)
    }

    watchers.on(key, callback)
  }) }),
})

const notifyStateChange = (nextState: NeovimState, key: string, value: any) => {
  stateChangeFns.forEach(fn => fn(nextState, key, value))
}

export default new Proxy(state, {
  set: (_, key: string, val: any) => {
    const currentVal = Reflect.get(state, key)
    if (currentVal === val) return true

    const nextState = { ...state, [key]: val }

    Reflect.set(state, key, val)
    watchers.emit(key, val)
    notifyStateChange(nextState, key, val)

    return true
  }
})

if (process.env.VEONIM_DEV) {
  // assumes we are also using hyperapp-redux-devtools
  // we are gonna steal the modules from ^^^
  const { createStore } = require('redux')
  const { composeWithDevTools } = require('redux-devtools-extension')

  const composeEnhancers = composeWithDevTools({ name: 'neovim-state' })
  const reducer = (state: any, action: any) => ({ ...state, ...action.payload })
  const store = createStore(reducer, state, composeEnhancers())

  store.subscribe(() => Object.assign(state, store.getState()))
  onStateChange((_, key, val) => {
    store.dispatch({ type: `SET::${key}`, payload: { [key]: val } })
  })
}
