import { call, autocmd, notify, define, request } from '../neovim-client'
import { merge, cc, Actions, Events, findIndexRight, hasUpperCase, debounce } from '../../utils'
import * as harvester from './keyword-harvester'
import { onVimCreate } from '../sessions'
import { filter } from 'fuzzaldrin-plus'
import { sub } from '../../dispatch'
import { translate } from '../css'
import { h, app } from './plugins'
import ui from '../canvasgrid'
const { cmd, setVar } = notify
const { expr, getCurrentLine } = request

const orderCompletions = (m: string[], query: string) =>
  m.slice().sort(a => hasUpperCase(a) ? -1 : a.startsWith(query) ? -1 : 1)

// TODO: get from lang server
const completionTriggers = new Map<string, RegExp>()
// TODO: $$$$ sign, reallY?
completionTriggers.set('javascript', /[^\w\$\-]/)
completionTriggers.set('typescript', /[^\w\$\-]/)

interface CompletionOption { id: number, text: string }
interface State { options: CompletionOption[], vis: boolean, ix: number, x: number, y: number }

const state: State = { options: [], vis: false, ix: 0, x: 0, y: 0 }

const view = ({ options, vis, ix, x, y }: State) => h('#autocomplete.plugin', {
  hide: !vis,
  style: { 'justify-content': 'flex-start' }
}, [
  h('div', { style: {
    'min-width': '100px',
    'max-width': '300px',
    position: 'absolute',
    transform: translate(x, y),
  }}, options.map(({ id, text }) => h('.row.complete', {
    key: id,
    css: { active: id === ix },
  }, [
    h('span', text)
  ])))
])

const a: Actions<State> = {}

a.show = (_s, _a, { options, ix, x, y }) => ({ options, ix, x, y, vis: true })
a.hide = () => ({ vis: false, ix: 0 })
a.select = (_s, _a, ix: number) => ({ ix })

const e: Events<State> = {}

// TODO: can we pls bind events to actions? it's always duplicate...
e.show = (_s, a, stuff) => a.show(stuff)
e.hide = (_s, a) => a.hide()
e.select = (_s, a, ix: number) => a.select(ix)

const pluginUI = app({ state, view, actions: a, events: e }, false)

interface Cache { startIndex: number, completionItems: string[], filetype: string, file: string, revision: number, cwd: string }

// TODO: toggle this when renaming or performing other 'non-update' changes to buffer
let pauseUpdate = false

// TODO: i wonder if it might be more prudent to create a veonim plugin and install once...
onVimCreate(() => {
  const cache: Cache = { startIndex: 0, completionItems: [], filetype: '', file: '', revision: -1, cwd: '' }

  cmd(`aug Veonim | au! | aug END`)

  define.VeonimComplete`
    return a:1 ? g:veonim_complete_pos : g:veonim_completions
  `

  define.CompleteScroll`
    if len(g:veonim_completions)
      if g:veonim_completing
        return a:1 ? "\\<c-n>" : "\\<c-p>"
      endif

      let g:veonim_completing = 1
      return a:1 ? "\\<c-x>\\<c-u>" : "\\<c-x>\\<c-u>\\<c-p>\\<c-p>"
    endif

    return a:1 ? "\\<tab>" : "\\<c-w>"
  `

  setVar('veonim_completing', 0)
  setVar('veonim_complete_pos', 1)
  setVar('veonim_completions', [])

  cmd(`set completefunc=VeonimComplete`)
  cmd(`ino <expr> <tab> CompleteScroll(1)`)
  cmd(`ino <expr> <s-tab> CompleteScroll(0)`)

  autocmd.completeDone(async () => {
    setVar('veonim_completing', 0)
    const { word } = await expr(`v:completed_item`)
    // TODO: do what with completed word? mru cache?
    console.log('completed word:', word)
    updateVim([])
  })

  autocmd.insertLeave(() => {
    cache.startIndex = 0
    pluginUI('hide')
  })

  const findQuery = (filetype: string, line: string, column: number) => {
    const pattern = completionTriggers.get(filetype) || /[^\w\-]/
    const start = findIndexRight(line, pattern, column - 2) || 0
    const startIndex = start ? start + 1 : 0
    const query = line.slice(startIndex, column - 1) || ''
    const leftChar = line[start]
    // TODO: should startIndex be modified for leftChar?
    return { startIndex, query, leftChar }
  }

  const getPos = async () => {
    // TODO: use nvim_window_* api instead or ui.cursor position?
    const [ buffer, line, column, offset ] = await call.getpos('.')
    return { buffer, line, column, offset }
  }

  const updateVim = (items: string[]) => {
    cache.completionItems = items
    setVar('veonim_completions', items)
  }

  const getCompletions = async () => {
    // TODO: use neovim api built-ins? better perf? line is slowest. could use ui.cursor pos instead of getPos()
    const [ lineData, { line, column } ] = await cc(getCurrentLine(), getPos())
    const { startIndex, query } = findQuery(cache.filetype, lineData, column)

    // TODO: if (left char is . or part of the completionTriggers defined per filetype) 
    if (query.length) {
      console.time('getKW')
      const words = harvester.getKeywords(cache.cwd, cache.file)
      console.timeEnd('getKW')
      if (!words || !words.length) return
      // TODO: call keywords + semantic = combine -> filter against query
      // TODO: call once per startIndex. don't repeat call if startIndex didn't change?
      // TODO: only call this if query has changed 

      // query.toUpperCase() allows the filter engine to rank camel case functions higher
      // aka: saveUserAccount > suave for query: 'sua'
      const completions = filter(words, query.toUpperCase(), { maxResults: 8 }) 

      if (!completions.length) {
        updateVim([])
        pluginUI('hide')
        return
      }

      const orderedCompletions = orderCompletions(completions, query)
      updateVim(orderedCompletions)

      const options = orderedCompletions.map((text, id) => ({ id, text }))
      const y = ui.rowToY(line)
      const x = ui.colToX(Math.max(0, startIndex - 1))
      pluginUI('show', { options, ix: -1, x, y })

      // TODO: do we always need to update this?
      // TODO: cache last position in insert session
      // only update vim if (changed) 
      // use cache - if (same) dont re-ask for keyword/semantic completions from avo
      //if (cache.startIndex !== startIndex) {
        //setVar('veonim_complete_pos', startIndex)
        //pluginUI('show')
      //}
      setVar('veonim_complete_pos', startIndex)
    } else {
      pluginUI('hide')
      updateVim([])
    }
  }

  sub('pmenu.select', ix => pluginUI('select', ix))
  sub('pmenu.hide', () => pluginUI('hide'))

  autocmd.cursorMovedI(() => getCompletions())
  autocmd.bufEnter(debounce(async () => {
    const [ cwd, file, filetype ] = await cc(call.getcwd(), call.expand(`%f`), expr(`&filetype`))
    merge(cache, { cwd, file, filetype, revision: -1 })
    updateServer()
  }, 100))

  const updateServer = async (lineChange = false) => {
    // TODO: use nvim_* api for getting line/buffer
    // TODO: update line changes for other LS stuffz
    if (lineChange) {
      //await call.getline('.')
      return
    }

    harvester.update(cache.cwd, cache.file, await call.getline(1, '$') as string[])
  }

  const attemptUpdate = async (lineChange: boolean) => {
    if (pauseUpdate) return
    const chg = await expr('b:changedtick')
    if (chg > cache.revision) updateServer(lineChange)
    cache.revision = chg
  }

  // TODO: move to a more generic location once other users need buffer changes
  autocmd.textChanged(debounce(attemptUpdate, 200))
  autocmd.textChangedI(() => attemptUpdate(true))
})
