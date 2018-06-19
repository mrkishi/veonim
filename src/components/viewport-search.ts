import { activeWindow, currentWindowElement } from '../core/windows'
import { current as vim, cmd, action } from '../core/neovim'
import { divinationSearch } from '../components/divination'
import { finder } from '../ai/update-server'
import Input from '../components/text-input'
import { merge } from '../support/utils'
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

interface QueryResult {
  results: FilterResult[],
  performVimSearch: boolean,
}

const getVisibleResults = (results: FilterResult[], start: number, end: number): FilterResult[] => {
  const visibleOnly = results.filter(m => m.start.line >= start && m.end.line <= end)
  return visibleOnly.length ? visibleOnly : results
}

const getVisibleRows = () => {
  const win = activeWindow()
  if (!win) return 20
  return win.getSpecs().height
}

const topMatchPosition = { line: -1, column: -1 }
const state = { value: '', focus: false }

type S = typeof state

const searchInBuffer = (query: string, results: FilterResult[], performVimSearch: boolean) => {
  if (!results.length || performVimSearch) {
    return query ? cmd(`/${query}`) : cmd(`noh`)
  }

  const { line, column } = results[0].start

  merge(topMatchPosition, {
    line: line + 1,
    column: column,
  })

  const range = {
    start: line,
    end: line + getVisibleRows(),
  }

  const visibleResults = getVisibleResults(results, range.start, range.end)

  const parts = visibleResults
    .map(m => m.line.slice(m.start.column, m.end.column + 1))
    .filter((m, ix, arr) => arr.indexOf(m) === ix)
    .filter(m => m)
    .map(m => m.replace(/[\*\/\^\$\.\~\&]/g, '\\$&'))

  const pattern = parts.length ? parts.join('\\|') : query
  if (!pattern) return cmd(`noh`)

  cmd(`/\\%>${range.start}l\\%<${range.end}l${pattern}`)
}

const actions = {
  show: () => ({ focus: true }),
  hide: () => {
    currentWindowElement.remove(containerEl)
    return { value: '', focus: false }
  },
  change: (value: string) => {
    finder.request.query(vim.cwd, vim.file, value).then((res: QueryResult) => {
      const { performVimSearch = true, results = [] } = res || {}
      searchInBuffer(value, results, performVimSearch)
    })

    return { value }
  },
  select: () => {
    currentWindowElement.remove(containerEl)
    divinationSearch()
    return { value: '', focus: false }
  },
}

type A = typeof actions

const view = ($: S, a: A) => h('div', {
  style: {
    background: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    width: '100%',
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
  boxShadow: '0 0 10px rgba(0, 0, 0, 0.6)',
})

const ui = app({ name: 'viewport-search', state, actions, view, element: containerEl })

action('viewport-search', () => {
  currentWindowElement.add(containerEl)
  ui.show()
})
