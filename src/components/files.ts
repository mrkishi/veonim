import { action, current, call, cmd } from '../core/neovim'
import { h, app, style, Actions } from '../ui/uikit'
import Input from '../components/text-input'
import { basename, dirname } from 'path'
import Worker from '../messaging/worker'
import vimUI from '../core/canvasgrid'

interface FileDir {
  dir: string,
  file: string,
}

interface State {
  val: string,
  files: FileDir[],
  cache: FileDir[],
  vis: boolean,
  ix: number,
  currentFile: string,
  loading: boolean,
}

const worker = Worker('fs-fuzzy')
const formatDir = (dir: string) => dir === '.' ? '' : `${dir}/`
const asDirFile = (files: string[], currentFile: string) => files
  .filter(m => m !== currentFile)
  .map(path => ({
    dir: formatDir(dirname(path)),
    file: basename(path),
  }))

const state: State = {
  val: '',
  files: [],
  cache: [],
  vis: false,
  ix: 0,
  currentFile: '',
  loading: false,
}

const Row = style('div')({
  ':last-child': {
    paddingBottom: '9px',
  },
  paddingLeft: '12px',
  paddingRight: '12px',
  paddingTop: '4px',
  paddingBottom: '4px',
  color: 'rgba(255, 255, 255, 0.8)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
})

const view = ({ val, files, vis, ix }: State, { change, hide, select, next, prev }: any) => h('#files.plugin', {
  hide: !vis,
}, [
  h('div', {
    style: {
      background: 'rgba(0, 0, 0, 0.44)',
      marginTop: '15%',
      width: '600px',
    },
    hide: !vis,
    onupdate: (e: HTMLElement) => setImmediate(() => {
      const { top: y, left: x, height, width } = e.getBoundingClientRect()
      console.log('pos x y h w', x, y, height, width)
      if (!height || !width) return vimUI.clearActiveBlur()
      vimUI.blurRegion({ x, y, height, width, amount: 40 })
    }),
  }, [
    Input({
      val,
      next,
      prev,
      change,
      hide,
      select,
      icon: 'search',
      focus: true,
      desc: 'find files',
    }),

    h('div', files.map((f, key) => Row({
      // TODO: lol nope
      key,
      style: key === ix ? { background: 'rgba(255, 255, 255, 0.08)' } : undefined,
    }, [
      h('span', { style: { color: '#666' } }, f.dir),
      h('span', f.file)
    ]))),
  ])
])

const a: Actions<State> = {}

a.show = (s, _a, currentFile: string) => ({ vis: true, currentFile, files: s.cache })

a.hide = () => {
  worker.call.stop()
  return { val: '', vis: false, ix: 0, loading: false, cache: [], files: [] }
}

a.select = (s, a) => {
  if (!s.files.length) return a.hide()
  const { dir, file } = s.files[s.ix]
  if (file) cmd(`e ${dir}${file}`)
  a.hide()
}

a.change = (_s, _a, val: string) => {
  worker.call.query(val)
  return { val }
}

a.results = (s, _a, files: string[]) => ({
  cache: !s.cache.length ? files.slice(0, 10) : s.cache,
  files: asDirFile(files, s.currentFile)
})

a.next = s => ({ ix: s.ix + 1 > Math.min(s.files.length - 1, 9) ? 0 : s.ix + 1 })
a.prev = s => ({ ix: s.ix - 1 < 0 ? Math.min(s.files.length - 1, 9) : s.ix - 1 })

const ui = app({ state, view, actions: a })
worker.on.results((files: string[]) => ui.results(files))

action('files', async () => {
  worker.call.load(current.cwd)
  const currentFile = await call.expand('%f')
  ui.show(currentFile)
})
