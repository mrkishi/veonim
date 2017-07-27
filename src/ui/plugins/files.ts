import { call } from '../neovim-client'
import * as uiInput from '../input'
import * as glob from 'globby'
import { basename, dirname } from 'path'
const { h, app } = require('hyperapp')

// TODO: utils
const cc = (...a: any[]) => Promise.all(a)
const formatDir = (dir: string) => dir === '.' ? '' : `${dir}/`

interface SearchEntry {
  name: string,
  base: string,
  modified?: boolean,
  dir: string
}

const getProjectFiles = (cwd: string): Promise<string[]> => glob('**', {
  cwd,
  nosort: true,
  nodir: true,
  ignore: [
    '**/node_modules/**',
    '**/*.png',
    '**/*.jpg',
    '**/*.gif',
  ]
})

const getFiles = async (cwd: string): Promise<SearchEntry[]> => {
  const [ currentFile, files ] = await cc(call.expand('%f'), getProjectFiles(cwd))

  return files
    .filter((m: string) => m !== currentFile)
    .map((name: string) => ({
      name,
      base: basename(name),
      key: name,
      dir: formatDir(dirname(name))
    }))
}


  //const file = await search.forSelection()
  // if (!file) return
  // cmd(`e ${file}`)

export default (getElement: Function) => {
  console.log('loaded files')

  const el = getElement('files')

  const state = {
    val: '',
    files: []
  }

  let elRef: any

  const view = ({ val }: any, { update, reset }: any) => h('div', null, [
    h('span', null, val),
    h('p', null, 'files'),
    h('input', { 
      oninsert: (e: any) => elRef = e,
      placeholder: 'files',
      value: val,
      onkeydown: update,
      onblur: () => {
        reset()
        el.deactivate()
        uiInput.focus()
      }
    })
  ])

  const actions = {
    reset: (s: any) => ({ ...s, val: '' }),
    update: (s: any, _a:any, e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        el.deactivate()
        uiInput.focus()
        return
      }

      if (e.key === 'Enter') {
        console.log('open:', s.val)
      }

      if (e.key === 'Backspace') return { ...s, val: s.val.slice(0, -1) }
      if (e.metaKey && e.key === 'w') return {
        ...s, val: s.val.split(' ').slice(0, -1).join(' ')
      }

      const key = e.key.length > 1 ? '' : e.key
      const val = s.val + key
      return { ...s, val }
    }
  }

  const events = {
    hydrate: (s: any, _a: any, data: any) => {
      console.log('hydrate', data)
      return { ...s, files: data }
    }
  }

  const emit = app({ state, view, actions, events, root: el.el })

  return async () => {
    const cwd = await call.getcwd().catch(e => console.log(e))
    if (!cwd) return console.log('wtf no cwd')
    const files = await getFiles(cwd).catch(e => console.log(e))

    console.log('files', files)

    // if getFiles is a one-time operation (i.e. not buffer results) then should store
    // result in local scope variable instead of calling emit/set state as that will cause
    // the UI to be re-rendered
    emit('hydrate', files)

    uiInput.blur()
    el.activate()

    elRef && elRef.focus && elRef.focus()
  }
}