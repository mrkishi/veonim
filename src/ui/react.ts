let reactModule = 'react/umd/react.production.min'
let reactDomModule = 'react-dom/umd/react-dom.production.min.js'

if (process.env.VEONIM_DEV || process.env.NODE_ENV === 'test') {
  reactModule = 'react'
  reactDomModule = 'react-dom'
}

const React = require(reactModule)
const ReactDom = require(reactDomModule)

const h = React.createElement
const render = (vNode: any, element: HTMLElement) => ReactDom.render(vNode, element)

export const toReactComponent = (component: any, options: object) => ({
  oncreate: (e: HTMLElement) => render(h(component, options), e),
  onupdate: (e: HTMLElement) => render(h(component, options), e),
})
