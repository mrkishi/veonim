import { call, autocmd, cmd, g, expr, getCurrentLine, define, onCreate } from '../neovim'
import { merge, cc, Actions, Events, findIndexRight, hasUpperCase, debounce } from '../../utils'
import * as harvester from './keyword-harvester'
import { filter } from 'fuzzaldrin-plus'
import { sub } from '../../dispatch'
import { translate } from '../css'
import { h, app } from './plugins'
import ui from '../canvasgrid'

const orderCompletions = (m: string[], query: string) =>
  m.slice().sort(a => hasUpperCase(a) ? -1 : a.startsWith(query) ? -1 : 1)

// TODO: get from lang server
const completionTriggers = new Map<string, RegExp>()
// TODO: $$$$ sign, reallY?
completionTriggers.set('javascript', /[^\w\$\-]/)
completionTriggers.set('typescript', /[^\w\$\-]/)

interface CompletionOption { id: number, text: string }
interface State { options: CompletionOption[], vis: boolean, ix: number, x: number, y: number }

const maxResults = 8
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

a.show = (_s, _a, { options, x, y, ix = -1 }) => ({ options, ix, x, y, vis: true })
a.hide = () => ({ vis: false, ix: 0 })
a.select = (_s, _a, ix: number) => ({ ix })

const e: Events<State> = {}

// TODO: can we pls bind events to actions? it's always duplicate...
e.show = (_s, a, stuff) => a.show(stuff)
e.hide = (_s, a) => a.hide()
e.select = (_s, a, ix: number) => a.select(ix)

const pluginUI = app({ state, view, actions: a, events: e }, false)

interface Cache { startIndex: number, completionItems: string[], filetype: string, file: string, revision: number, cwd: string }

const cache: Cache = { startIndex: 0, completionItems: [], filetype: '', file: '', revision: -1, cwd: '' }

// TODO: toggle this when renaming or performing other 'non-update' changes to buffer (rename, etc)
let pauseUpdate = false

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
  g.veonim_completions = items
}

const calcMenuPosition = (startIndex: number, column: number, count: number) => {
  // anchor menu above row if the maximum results are going to spill out of bounds.
  // why maxResults instead of the # of items in options? because having the menu jump
  // around over-under as you narrow down results by typing or undo is kinda annoying
  const row = ui.cursor.row + maxResults > ui.rows
    ? ui.cursor.row - count
    : ui.cursor.row + 1

  const start = Math.max(0, startIndex)
  const col = ui.cursor.col - (column - start)
  return { y: ui.rowToY(row), x: ui.colToX(col) }
}

const getCompletions = async () => {
  // TODO: use neovim api built-ins? better perf? line is slowest. ui.cursor not work as it's global
  const [ lineData, { column } ] = await cc(getCurrentLine(), getPos())
  const { startIndex, query } = findQuery(cache.filetype, lineData, column)

  // TODO: if (left char is . or part of the completionTriggers defined per filetype) 
  if (query.length) {
    const words = await harvester.getKeywords(cache.cwd, cache.file)
    if (!words || !words.length) return
    // TODO: call keywords + semantic = combine -> filter against query
    // TODO: call once per startIndex. don't repeat call if startIndex didn't change?
    // TODO: only call this if query has changed 

    // query.toUpperCase() allows the filter engine to rank camel case functions higher
    // aka: saveUserAccount > suave for query: 'sua'
    const completions = filter(words, query.toUpperCase(), { maxResults })

    if (!completions.length) {
      updateVim([])
      pluginUI('hide')
      return
    }

    const orderedCompletions = orderCompletions(completions, query)
    updateVim(orderedCompletions)
    const options = orderedCompletions.map((text, id) => ({ id, text }))
    const { x, y } = calcMenuPosition(startIndex, column, options.length)
    pluginUI('show', { options, x, y })

    // TODO: do we always need to update this?
    // TODO: cache last position in insert session
    // only update vim if (changed) 
    // use cache - if (same) dont re-ask for keyword/semantic completions from avo
    //if (cache.startIndex !== startIndex) {
      //setVar('veonim_complete_pos', startIndex)
      //pluginUI('show')
    //}
    g.veonim_complete_pos = startIndex
  } else {
    pluginUI('hide')
    updateVim([])
  }
}

const updateServer = async (lineChange = false) => {
  // TODO: use nvim_* api for getting line/buffer
  // TODO: update line changes for other lang serv stuffz
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

sub('pmenu.select', ix => pluginUI('select', ix))
sub('pmenu.hide', () => pluginUI('hide'))

autocmd.cursorMovedI(() => getCompletions())
autocmd.bufEnter(debounce(async () => {
  const [ cwd, file, filetype ] = await cc(call.getcwd(), call.expand(`%f`), expr(`&filetype`))
  merge(cache, { cwd, file, filetype, revision: -1 })
  updateServer()
}, 100))

// TODO: move to a more generic location once other users need buffer changes
autocmd.textChanged(debounce(attemptUpdate, 200))
autocmd.textChangedI(() => attemptUpdate(true))

autocmd.completeDone(async () => {
  g.veonim_completing = 0
  const { word } = await expr(`v:completed_item`)
  // TODO: do what else with completed word? mru cache?
  harvester.addWord(cache.cwd, cache.file, word)
  updateVim([])
})

autocmd.insertLeave(() => {
  cache.startIndex = 0
  pluginUI('hide')
})

onCreate(() => {
  g.veonim_completing = 0
  g.veonim_complete_pos = 1
  g.veonim_completions = []

  cmd(`set completefunc=VeonimComplete`)
  cmd(`ino <expr> <tab> CompleteScroll(1)`)
  cmd(`ino <expr> <s-tab> CompleteScroll(0)`)
})
