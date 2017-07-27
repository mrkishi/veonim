import { call, notify } from '../neovim-client'
import { cc } from '../../utils'
import * as uiInput from '../input'
import * as glob from 'globby'
import { basename, dirname } from 'path'
import * as Fuse from 'fuse.js'
const { h, app } = require('hyperapp')
const { cmd } = notify

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
  console.log('current', currentFile)

  return files
    .filter((m: string) => m !== currentFile)
    .map((name: string) => ({
      name,
      base: basename(name),
      key: name,
      dir: formatDir(dirname(name))
    }))
}

export default (getElement: Function) => {
  console.log('loaded files')

  const el = getElement('files')

  let filesList: Fuse
  let filesRay: any[]

  const state = {
    val: '',
    files: []
  }

  let elRef: any

  const view = ({ val, files }: any, { update, reset }: any) => h('div', null, [
    h('input', { 
      class: 'input',
      oninsert: (e: any) => elRef = e,
      placeholder: 'files',
      value: val,
      onkeydown: update,
      onblur: () => {
        reset()
        el.deactivate()
        uiInput.focus()
      }
    }),
    h('ul', null, files.slice(0, 10).map((f: any) => h('li', null, f.name))),
  ])

  const actions = {
    reset: (s: any) => ({ ...s, val: '' }),
    update: (s: any, a:any, e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        el.deactivate()
        uiInput.focus()
        return a.reset()
      }

      if (e.key === 'Enter') {
        if (s.val) cmd(`e ${s.files[0].name}`)
        console.log(s.files[0].name)

        el.deactivate()
        setImmediate(() => {
          uiInput.focus()
        })
        return a.reset()
      }

      if (e.key === 'Backspace') return { ...s, val: s.val.slice(0, -1) }
      if (e.metaKey && e.key === 'w') {
        const val = s.val.split(' ').slice(0, -1).join(' ')
        return { ...s, val, files: val 
          ? s.files 
          : filesRay.slice(0, 10).sort((a, b) => a.name.length - b.name.length)
        }
      }

      const key = e.key.length > 1 ? '' : e.key
      const val = s.val + key
      if (val) {
        const files = filesList.search(val)
        return { ...s, val, files }
      }
      const files = filesRay.slice(0, 10).sort((a, b) => a.name.length - b.name.length)
      return { ...s, val, files }
    }
  }

  const events = {
    hydrate: (s: any, _a: any, data: any) => {
      console.log('hydrate', data)
      return { ...s, files: data }
    }
  }

  app({ state, view, actions, events, root: el.el })
  // const emit = app({ state, view, actions, events, root: el.el })

  return async () => {
    const cwd = await call.getcwd().catch(e => console.log(e))
    if (!cwd) return console.log('wtf no cwd')
    const files = await getFiles(cwd).catch(e => console.log(e))

    filesRay = files || []
    filesList = new Fuse(files || [], { keys: ['name'] })

    // use emit if we are going to get buffer/part updates of files list
    // emit/set state will trigger ui re-render
    // emit('hydrate', files)

    uiInput.blur()
    el.activate()

    elRef && elRef.focus && elRef.focus()
  }
}