import { Watchers } from '../support/utils'

interface State {
  background: string,
  foreground: string,
  special: string,
  mode: string,
}

interface WatchState {
  background(fn: (background: string) => void): void,
  foreground(fn: (foreground: string) => void): void,
  special(fn: (special: string) => void): void,
  mode(fn: (mode: string) => void): void,
}

const state: State = {
  background: '#2d2d2d',
  foreground: '#dddddd',
  special: '#ff0000',
  mode: 'normal',
}

const watchers = new Watchers()

export const watch = new Proxy({} as WatchState, {
  get: (_, key: string) => (fn: (value: any) => void) => watchers.add(key, fn),
})

export default new Proxy(state, {
  set: (_, key: string, val: any) => {
    Reflect.set(state, key, val)
    watchers.notify(key, val)
    return true
  }
})
