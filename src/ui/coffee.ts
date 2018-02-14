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

// TODO: production build because apparently the only way to use
// react is with a bundler or umd. nice meme.
// const React = require('react/umd/react.production.min')
const React = require('react')
const ReactDom = require('react-dom')
import huu from 'huu'

export const h = huu(React.createElement)

const hostElement = document.getElementById('plugins') as HTMLElement
const targetEl = document.createElement('div')
hostElement.appendChild(targetEl)

const view = h('div', [
  ,h('span', 'hey')
])

ReactDom.render(view, targetEl)
