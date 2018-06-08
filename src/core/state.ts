import { Watchers } from '../support/utils'

export enum VimMode {
  Normal,
  Insert,
  Visual,
  Replace,
  Operator,
  Terminal,
  CommandNormal,
  CommandInsert,
  CommandReplace,
  SomeModeThatIProbablyDontCareAbout,
}

interface State {
  background: string
  foreground: string
  special: string
  mode: VimMode
}

interface WatchState {
  background(fn: (background: string) => void): void
  foreground(fn: (foreground: string) => void): void
  special(fn: (special: string) => void): void
  mode(fn: (mode: VimMode) => void): void
}

const state: State = {
  background: '#2d2d2d',
  foreground: '#dddddd',
  special: '#ff0000',
  mode: VimMode.Normal,
}

const watchers = new Watchers()

export const watch = new Proxy({} as WatchState, {
  get: (_, key: string) => (fn: (value: any) => void) => watchers.add(key, fn),
})

// TODO: why not move neovim.current state to this file?  i think the reason
// for this module is so we can load immediately and not have to wait for late
// threads to start, etc.
export default new Proxy(state, {
  set: (_, key: string, val: any) => {
    const currentVal = Reflect.get(state, key)
    if (currentVal === val) return true

    Reflect.set(state, key, val)
    watchers.notify(key, val)
    return true
  }
})
