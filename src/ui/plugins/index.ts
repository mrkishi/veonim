import { sub } from '../neovim-client'
const action = sub('action')

const hostElement = document.getElementById('plugins')
export const getHostElement = () => hostElement as HTMLElement

import files from './files'
action('files', files)

if (process.env.VEONIM_DEV) {
  const plugins = [
    'files'
  ]

  const cleanup = (name: string) => {
    const el = document.getElementById(name)
    if (!el) return console.log('did not find', name)
    el.parentNode && el.parentNode.removeChild(el)
  }

  const { watch } = require('chokidar')
  const reload = require('require-reload')(require)

  plugins.forEach(p => watch(`${__dirname}/${p}.js`).on('change', () => {
    cleanup(p)
    const mod = reload(`./${p}`).default
    console.log(`reloading ${p}`)
    action(p, mod)
  }))
}