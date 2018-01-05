// TODO: get the typings when ready: https://github.com/hyperapp/hyperapp/pull/311
import { showCursor, hideCursor } from '../core/cursor'
const { h: hs, app: makeApp } = require('hyperapp')
import { merge, proxyFn } from '../support/utils'
import * as viminput from '../core/input'
const picostyle = require('picostyle')
import huu from 'huu'

export interface ActionCaller { [index: string]: (data?: any) => void }
export interface Actions<T> { [index: string]: (state: T, actions: ActionCaller, data: any) => any }
export interface Events<T> { [index: string]: (state: T, actions: ActionCaller, data: any) => any }

const hostElement = document.getElementById('plugins')

export const style = picostyle(hs)
export const h = huu(hs)

export const vimFocus = () => {
  setImmediate(() => viminput.focus())
  showCursor()
}

export const vimBlur = () => {
  viminput.blur()
  hideCursor()
}

// TODO: because mixins and events.beforeAction dont work in the current npm release of hyperapp
// TODO: formalize the wrappings in huu module?
// TODO: don't export Action/Event from utils and this from plugin. put in central organized place...
export const app = (appParts: any, switchFocus = true, root = hostElement) => {
  const { show, hide } = appParts.actions

  if (switchFocus) appParts.actions.show = (s: any, a: any, d: any) => {
    vimBlur()
    return show(s, a, d)
  }

  if (switchFocus) appParts.actions.hide = (s: any, a: any, d: any) => {
    vimFocus()
    return hide(s, a, d)
  }

  const eventsProxy = new Proxy(appParts.actions, {
    get: (_t, key) => (_s: any, actions: any, data: any) => Reflect.get(actions, key)(data)
  })

  const emit = makeApp(merge(appParts, { root, events: eventsProxy }))
  return proxyFn((action, data) => emit(action, data))
}
