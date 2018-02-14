let reactModule = 'react/umd/react.production.min'
let reactDomModule = 'react-dom/umd/react-dom.production.min.js'

if (process.env.VEONIM_DEV) reactModule = 'react'
if (process.env.VEONIM_DEV) reactDomModule = 'react-dom'

const React = require(reactModule)
const ReactDom = require(reactDomModule)

import huu from 'huu'

export const h = huu(React.createElement)
export const renderDom = (vNode: any, element: HTMLElement) => ReactDom.render(vNode, element)
