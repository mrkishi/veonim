import { divinationSearch } from '../components/divination'
import { currentWindowElement } from '../core/windows'
import { cmd, action, expr } from '../core/neovim'
import { finder } from '../ai/update-server'
import Input from '../components/text-input'
import * as Icon from 'hyperapp-feather'
import { makel } from '../ui/vanilla'
import { app, h } from '../ui/uikit'

interface FilterResult {
  line: string,
  start: {
    line: number,
    column: number,
  },
  end: {
    line: number,
    column: number,
  }
}

const state = { value: '', focus: false }

type S = typeof state

const searchInBuffer = async (results = [] as FilterResult[]) => {
  if (!results.length) return cmd('noh')

  const [ start, end ] = await Promise.all([
    expr(`line('w0')`),
    expr(`line('w$')`),
  ])

  const parts = results
    .map(m => m.line.slice(m.start.column, m.end.column + 1))
    .filter((m, ix, arr) => arr.indexOf(m) === ix)
    .filter(m => m)
    .map(m => m.replace(/[\*\/\^\$\.\~\&]/g, '\\$&'))

  const pattern = parts.join('\\|')
  if (!pattern) return cmd('noh')

  cmd(`/\\%>${start}l\\%<${end}l${pattern}`)
}

const actions = {
  show: () => ({ focus: true }),
  hide: () => {
    currentWindowElement.remove(containerEl)
    return { value: '', focus: false }
  },
  change: (value: string) => {
    finder.request.visibleFuzzy(value).then((results: FilterResult[]) => {
      searchInBuffer(results)
    })

    return { value }
  },
  select: () => {
    currentWindowElement.remove(containerEl)
    // TODO: if only one search result, jump directly to it
    // or maybe if results <= 3? hitting two chars for jump
    // label is same as hitting nn (jump to next search)
    divinationSearch()
    return { value: '', focus: false }
  },
}

type A = typeof actions

const view = ($: S, a: A) => h('div', {
  style: {
    display: 'flex',
    flex: 1,
  },
}, [

  ,Input({
    small: true,
    focus: $.focus,
    value: $.value,
    icon: Icon.Search,
    hide: a.hide,
    change: a.change,
    select: a.select,
  })

])

const containerEl = makel('div', {
  position: 'absolute',
  width: '100%',
  display: 'flex',
  // TODO: use colorscheme bg colors like in file/fuzzy menu
  background: 'rgba(0, 0, 0, 0.8)',
  boxShadow: '0 0 10px rgba(0, 0, 0, 0.6)',
})

const ui = app<S, A>({ name: 'viewport-search', state, actions, view, element: containerEl })

action('viewport-search', () => {
  currentWindowElement.add(containerEl)
  ui.show()
})
