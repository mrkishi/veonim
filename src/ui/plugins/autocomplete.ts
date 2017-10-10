import { call, autocmd, g, expr, getCurrentLine } from '../neovim'
import { cc, findIndexRight, hasUpperCase } from '../../utils'
import * as harvester from './keyword-harvester'
import { h, app, Actions } from '../uikit'
import { filter } from 'fuzzaldrin-plus'
import { sub } from '../../dispatch'
import { translate } from '../css'
import vimUI from '../canvasgrid'
import { cache } from '../../ai'

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

const ui = app({ state, view, actions: a }, false)

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
  const row = vimUI.cursor.row + maxResults > vimUI.rows
    ? vimUI.cursor.row - count
    : vimUI.cursor.row + 1

  const start = Math.max(0, startIndex)
  const col = vimUI.cursor.col - (column - start)
  return { y: vimUI.rowToY(row), x: vimUI.colToX(col) }
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
      ui.hide()
      return
    }

    const orderedCompletions = orderCompletions(completions, query)
    updateVim(orderedCompletions)
    const options = orderedCompletions.map((text, id) => ({ id, text }))
    const { x, y } = calcMenuPosition(startIndex, column, options.length)
    ui.show({ options, x, y })

    // TODO: do we always need to update this?
    // TODO: cache last position in insert session
    // only update vim if (changed) 
    // use cache - if (same) dont re-ask for keyword/semantic completions from avo
    //if (cache.startIndex !== startIndex) {
      //setVar('veonim_complete_pos', startIndex)
      //ui.show()
    //}
    g.veonim_complete_pos = startIndex
  } else {
    ui.hide()
    updateVim([])
  }
}

sub('pmenu.select', ix => ui.select(ix))
sub('pmenu.hide', () => ui.hide())

autocmd.cursorMovedI(() => getCompletions())

autocmd.completeDone(async () => {
  g.veonim_completing = 0
  const { word } = await expr(`v:completed_item`)
  harvester.addWord(cache.cwd, cache.file, word)
  updateVim([])
})

autocmd.insertLeave(() => {
  cache.startIndex = 0
  ui.hide()
})
