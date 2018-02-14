// not like i need the typings for react, but... if i install @types/react the
// webworkers tsconfig goes apeshit trying to include it for some unknown
// reason - WITHOUT ACTUALLY WRITING ANY CODE THAT HAS THE WORD 'react' IN IT.
// WHAT THE FUCK
// WHAT THE FUCK
// WHAT THE FUCK
// WHAT THE FUCK
// WHAT THE FUCK
// WHAT THE FUCK
// WHAT THE FUCK
// WHAT THE FUCK
// WHAT THE FUCK
// WHAT THE FUCK
// WHAT THE FUCK
// WHAT THE FUCK
// web development is a meme.

let reactModule = 'react/umd/react.production.min'
let reactDomModule = 'react-dom/umd/react-dom.production.min.js'

if (process.env.VEONIM_DEV) reactModule = 'react'
if (process.env.VEONIM_DEV) reactDomModule = 'react-dom'

const React = require(reactModule)
const ReactDom = require(reactDomModule)

import huu from 'huu'

export const h = huu(React.createElement)

const hostElement = document.getElementById('plugins') as HTMLElement
const targetEl = document.createElement('div')
hostElement.appendChild(targetEl)

const view = h('div', [
  ,h('span', 'hey')
])

ReactDom.render(view, targetEl)
