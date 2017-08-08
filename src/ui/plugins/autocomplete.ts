import { call, autocmd, notify, define, request } from '../neovim-client'
import { cc, Actions, Events, findIndexRight } from '../../utils'
import { onVimCreate } from '../sessions'
import { filter } from 'fuzzaldrin-plus'
import { sub } from '../../dispatch'
import { translate } from '../css'
import { h, app } from './plugins'
import ui from '../canvasgrid'
const { cmd, setVar } = notify
const { expr, getCurrentLine } = request

// TODO: get from lang server
const completionTriggers = new Map<string, RegExp>()
completionTriggers.set('javascript', /[^\w\$]/)

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
  }}, options.map(({ id, text }) => h('.row', {
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

const emit = app({ state, view, actions: a, events: e }, false)

const tempSource = ['yoda', 'obi-wan', 'luke', 'anakin', 'qui-gon', 'leia', 'rey', 'padme', 'vader', 'emperor', 'jar-jar', 'han', 'threepio', 'artoo', 'lando', 'porkins']

interface G { startIndex: number, completionItems: string[] }

// TODO: i wonder if it might be more prudent to create a veonim plugin and install once...
onVimCreate(() => {
  const g: G = {
    startIndex: 0,
    completionItems: []
  }

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
  setVar('veonim_completions', g.completionItems)

  cmd(`set completefunc=VeonimComplete`)
  cmd(`ino <expr> <tab> CompleteScroll(1)`)
  cmd(`ino <expr> <s-tab> CompleteScroll(0)`)

  autocmd.completeDone(async () => {
    cmd(`let g:veonim_completing = 0`)
    const { word } = await expr(`v:completed_item`)
    console.log('completed word:', word)
    g.completionItems = []
    update(g.completionItems)
  })

  autocmd.insertLeave(() => {
    g.startIndex = 0
    emit('hide')
  })

  const findQuery = (filetype: string, line: string, column: number) => {
    const pattern = completionTriggers.get(filetype) || /[^\w]/
    const start = findIndexRight(line, pattern, column - 2) || 0
    const startIndex = start ? start + 1 : 0
    const query = line.slice(startIndex, column - 1) || ''
    const leftChar = line[start]
    // TODO: should startIndex be modified for leftChar?
    return { startIndex, query, leftChar }
  }

  const getPos = async () => {
    // TODO: use nvim_window_* api instead
    const [ buffer, line, column, offset ] = await call.getpos('.')
    return { buffer, line, column, offset }
  }

  const update = (items: string[]) => {
    // TODO: make sure to validate the right data being sent
    // TODO: send more than just strings. send rich data with id metadata.
    // that way when we get external popup menu notifications we can hook into local
    // richer metadata to populate ui completion menu
    setVar('veonim_completions', items)
  }

  const getCompletions = async () => {
    // TODO: use neovim api built-ins? better perf? line is slowest. could use ui.cursor pos instead of getPos()
    const [ lineData, { line, column } ] = await cc(getCurrentLine(), getPos())
    const { startIndex, query } = findQuery('javascript', lineData, column)

    //console.log(`      `)
    //console.log('startIndex:', startIndex)
    //console.log('query:', JSON.stringify(query))
    //console.log('leftChar:', leftChar)
    // TODO: if (left char is .) we need to do semantic completions
    // left char is === completionTriggers regex
    // set complete_pos
    if (query.length) {
      // TODO: call keywords + semantic = combine -> filter against query
      // use subsequence matching with case sensitivy priority
      // YCM has a good algo. maybe fzy too. USE FUZZALDRIN?
      // TODO: fuzzaldrin is not that great here because we need to filter from start of word only...
      // TODO: only call this if query has changed 
      g.completionItems = filter(tempSource, query, { maxResults: 8 })
      update(g.completionItems)
      const options = g.completionItems.map((text, id) => ({ id, text }))
      const y = ui.rowToY(line)
      const x = ui.colToX(Math.max(0, startIndex - 1))
      if (g.completionItems.length) emit('show', { options, ix: -1, x, y })

      // TODO: do we always need to update this?
      // TODO: cache last position in insert session
      // only update vim if (changed) 
      // use cache - if (same) dont re-ask for keyword/semantic completions from avo
      //if (g.startIndex !== startIndex || !g.visible) {
        //console.log(`showing cmenu`)
        //cmd(`let g:veonim_complete_pos = ${startIndex}`)
        //const { x, y } = await getScreenCursorPos()
        //show(Math.max(0, startIndex - 1), vim.column, x, y)
      //}
      cmd(`let g:veonim_complete_pos = ${startIndex}`)
    } else {
      emit('hide')
      g.completionItems = []
      update(g.completionItems)
    }
  }

  autocmd.cursorMovedI(() => getCompletions())

  sub('pmenu.select', ix => emit('select', ix))
  sub('pmenu.hide', () => emit('hide'))

  // TODO: yeah good idea, but hook up in neovim instance class
  // get filetype (used to determine separator used for finding startIndex. each lang might be different)
  //autocmd.bufEnter(debounce(async m => {
    //current.file = await call.expand('%f')
    //// TODO: use filetype for js-langs
    //current.filetype = await expr(`&filetype`)
    ////updateServer()
  //}, 100))
})
