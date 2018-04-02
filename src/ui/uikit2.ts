import { connect as connectToStore } from 'react-redux'
import { createStore, Action } from 'redux'

export interface App {
  state: object,
  view: Function,
  actions: object,
  element?: HTMLElement,
}

// let reactModule = 'react/umd/react.production.min'
let reactDomModule = 'react-dom/umd/react-dom.production.min.js'

// if (process.env.VEONIM_DEV) reactModule = 'react'
if (process.env.VEONIM_DEV) reactDomModule = 'react-dom'

// const React = require(reactModule)
const ReactDom = require(reactDomModule)

export const app = ({ state, view, actions, element = document.body }: App) => {
  ReactDom.render(view, element)

  return new Proxy(actions, {
    get: (target, key) => {
      const fn = Reflect.get(target, key)
      return (data: any) => {
        console.log('args:', data)
        const res = fn({ ...state }, data)
        console.log('res:', res)
        const nextState = { ...state, ...res }
        console.log('prev state:', state)
        console.log('next state:', nextState)
      }
    }
  })
}
