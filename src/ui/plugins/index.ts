import { sub } from '../neovim-client'
const action = sub('action')

// TODO: is this the best strategy for housing hyperapp element? seems like we could just control
// position and visibility from within hyperapp state
export const getElement = (name: string) => {
  const exist = document.getElementById(name)
  if (exist) document.body.removeChild(exist)

  const fresh = document.createElement('div')
  fresh.setAttribute('id', name)
  fresh.setAttribute('class', 'plugin')
  document.body.appendChild(fresh)

  return {
    el: fresh,
    activate: () => fresh.style.display = 'block',
    deactivate: () => fresh.style.display = 'none'
  }
}


import files from './files'

action('files', files(getElement))

if (process.env.VEONIM_DEV) {
  const { watch } = require('chokidar')
  const reload = require('require-reload')(require)

  const plugins = [
    'files'
  ]

  plugins.forEach(p => watch(`${__dirname}/${p}.js`).on('change', () => {
    const mod = reload(`./${p}`).default
    console.log(`reloading ${p}`)
    action(p, mod(getElement))
  }))
}