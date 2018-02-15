let reactModule = 'react/umd/react.production.min'
let reactDomModule = 'react-dom/umd/react-dom.production.min.js'

if (process.env.VEONIM_DEV) reactModule = 'react'
if (process.env.VEONIM_DEV) reactDomModule = 'react-dom'

const React = require(reactModule)
const ReactDom = require(reactDomModule)

import hyperscript from '../ui/hyperscript'

export const h = hyperscript(React.createElement)
export const createElement = React.createElement
export const renderDom = (vNode: any, element: HTMLElement) => ReactDom.render(vNode, element)
