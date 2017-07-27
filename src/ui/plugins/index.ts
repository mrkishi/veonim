import { sub } from '../neovim-client'
const action = sub('action')
import { watch } from 'chokidar'
const reload = require('require-reload')(require)

const getElement = (name: string) => {
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

watch(`${__dirname}/files.js`).on('change', () => {
  const mod = reload('./files').default
  console.log('files changed')
  action('files', mod(getElement))
})

}


action('buffers', () => {
  console.log('get me dat bufferz')
})
