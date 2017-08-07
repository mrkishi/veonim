import { Watchers } from './utils'

const watchers = new Watchers()

export const sub = (event: string, cb: (...args: any[]) => void) => watchers.add(event, cb)
export const pub = (event: string, ...args: any[]) => watchers.notify(event, ...args)
export const unsub = (event: string, cb: Function) => watchers.remove(event, cb)
