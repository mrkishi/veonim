// import { Plugin } from '../components/plugin-container'
// import { RowNormal } from '../components/row-container'
// import FiletypeIcon from '../components/filetype-icon'
import { Plugin, Row } from '../styles/common'
import { action, current, cmd } from '../core/neovim'
import { basename, dirname, join } from 'path'
import Input from '../components/text-input'
import Worker from '../messaging/worker'
import { h, app } from '../ui/uikit'
import * as devtools from 'hyperapp-redux-devtools'
import { React, ReactDom } from '../ui/uikit2'
import * as VirtualList from 'react-tiny-virtual-list'

interface FileDir {
  dir: string,
  file: string,
}

const worker = Worker('project-file-finder')
const formatDir = (dir: string) => dir === '.' ? '' : `${dir}/`
const asDirFile = (files: string[], currentFile: string) => files
  .filter(m => m !== currentFile)
  .map(path => ({
    dir: formatDir(dirname(path)),
    file: basename(path),
  }))

const state = {
  val: '',
  files: [] as FileDir[],
  cache: [] as FileDir[],
  vis: false,
  ix: 0,
  currentFile: '',
  loading: false,
}

type S = typeof state

const resetState = { val: '', vis: false, ix: 0, loading: false, cache: [], files: [] }

const actions = {
  show: (currentFile: string) => (s: S) => ({
    vis: true,
    currentFile,
    files: s.cache,
    loading: true,
  }),

  hide: () => {
    worker.call.stop()
    return resetState
  },

  select: () => (s: S) => {
    if (!s.files.length) return resetState
    const { dir, file } = s.files[s.ix]
    const path = join(dir, file)
    if (file) cmd(`e ${path}`)
    return resetState
  },

  change: (val: string) => {
    worker.call.query(val)
    return { val }
  },

  results: (files: string[]) => (s: S) => ({
    cache: !s.cache.length ? files.slice(0, 10) : s.cache,
    files: asDirFile(files, s.currentFile)
  }),


  loadingDone: () => ({ loading: false }),

  next: () => (s: S) => ({ ix: s.ix + 1 > Math.min(s.files.length - 1, 9) ? 0 : s.ix + 1 }),
  prev: () => (s: S) => ({ ix: s.ix - 1 < 0 ? Math.min(s.files.length - 1, 9) : s.ix - 1 }),
}

const st = {
  items: ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'four', 'eight', 'five', 'six', 'nine', 'ten', 'four', 'three', 'six', 'nine', 'four', 'three', 'four', 'one', 'three', 'two', 'four', 'one', 'six', 'nine', 'four'],
  ix: 0
}

const acts = {
  goNext: () => (s: typeof st) => ({ ix: s.ix + 1 })
}

// const canvasContainer = document.getElementById('canvas-container') as HTMLElement
// const containerEl = document.createElement('div')
// containerEl.setAttribute('id', 'lolumaddude')
// canvasContainer.appendChild(containerEl)

const containerEl = document.body
const appy = devtools(app, { name: 've-files' })

// const containerEl = document.getElementById('plugins') as HTMLElement
const ui = appy(st, acts, ($: typeof st, a: typeof acts) => h('ul', [
  ,h('span', $.ix)
  ,h('.react-container', {
    style: {
      zIndex: 999999
    },
    oncreate: e => {
      console.log('create!', VirtualList)
      const comp = React.createElement(VirtualList, {
        width: '100%',
        height: 100,
        itemCount: $.items.length,
        itemSize: 20,
        renderItem: ({ index, style }: any) => React.createElement('div', {
          style,
          key: index,
        }, $.items[index]),
      })

      ReactDom.render(comp, e)
    },
    onupdate: e => {
      console.log('update!')
      const comp = React.createElement(VirtualList, {
        width: '100%',
        height: 60,
        itemCount: $.items.length,
        itemSize: 20,
        scrollToIndex: $.ix,
        renderItem: ({ index, style }: any) => React.createElement('div', {
          style,
          key: index,
        }, $.items[index]),
      })

      ReactDom.render(comp, e)
    }
  })
]), containerEl)

setInterval(() => {
  ui.goNext()
}, 2e3)
//const ui = app(state, actions, ($: S, a: typeof actions) => Plugin.default('files', $.vis, [

//  ,Input({
//    hide: a.hide,
//    select: a.select,
//    change: a.change,
//    next: a.next,
//    prev: a.prev,
//    val: $.val,
//    focus: true,
//    // icon: 'FileText',
//    icon: 'file-text',
//    desc: 'open file',
//    // TODO: loading is so fast that this flickers and looks janky
//    // use debounce or throttle to only show this if a loading operation
//    // has already been going for a few ms. e.g. 150ms or more, etc.
//    //loading: $.loading,
//  })

//  ,h('div', $.files.map(({ dir, file }, ix) => Row.normal({
//    key: `${dir}-${file}`,
//    activeWhen: ix === $.ix,
//  }, [
//    // ,FiletypeIcon(file)

//    ,h('span', { style: { color: 'var(--foreground-50)' } }, dir)

//    ,h('span', { style: {
//      color: ix === $.ix ? 'var(--foreground-b20)' : 'var(--foreground-30)'
//    } }, file)
//  ])))

//]), containerEl)

// worker.on.results((files: string[]) => ui.results(files))
// worker.on.done(ui.loadingDone)

// action('files', () => {
//   worker.call.load(current.cwd)
//   ui.show(current.file)
// })
