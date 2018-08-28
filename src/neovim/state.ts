import { VimMode } from '../neovim/interfaces'
import { EventEmitter } from 'events'

// TODO: make it redux compatible. immutable pls
const state = {
  background: '#2d2d2d',
  foreground: '#dddddd',
  special: '#ff0000',
  mode: VimMode.Normal,
}

type State = typeof state
type StateKeys = keyof State
type WatchState = { [Key in StateKeys]: (fn: (value: State[Key]) => void) => void }

const watchers = new EventEmitter()
const stateChangeFns = new Set<Function>()

export const watch = new Proxy(Object.create(null) as WatchState, {
  get: (_, key: string) => (fn: (value: any) => void) => watchers.on(key, fn),
})

export const onStateChange = (fn: (nextState: State) => void) => stateChangeFns.add(fn)

const notifyStateChange = (nextState: State) => stateChangeFns.forEach(fn => fn(nextState))

export default new Proxy(state, {
  set: (_, key: string, val: any) => {
    const currentVal = Reflect.get(state, key)
    if (currentVal === val) return true

    const nextState = { ...state, [key]: val }

    Reflect.set(state, key, val)
    watchers.emit(key, val)
    notifyStateChange(nextState)

    return true
  }
})

if (process.env.VEONIM_DEV) {
  // assumes we are also using hyperapp-redux-devtools
  // we are gonna steal the modules from ^^^
  // const redux = 

}
