import { current as vim, cmd, jumpTo, action } from '../core/neovim'
import { PluginBottom } from '../components/plugin-container'
import { activeWindow } from '../core/windows'
import { finder } from '../ai/update-server'
import Input from '../components/text-input'
import { merge } from '../support/utils'
import { app } from '../ui/uikit'

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

const state = {
  visible: false,
  value: '',
}

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
  show: () => ({ visible: true }),
  hide: () => ({ visible: false, value: '' }),
  change: (value: string) => {
    finder.request.query(vim.cwd, vim.file, value).then((res: QueryResult) => {
      const { performVimSearch = true, results = [] } = res || {}
      searchInBuffer(value, results, performVimSearch)
    })

    return { value }
  },
  select: () => {
    jumpTo(topMatchPosition)
    return { visible: false, value: '' }
  },
}

type A = typeof actions

const view = ($: S, a: A) => PluginBottom($.visible, [

  ,Input({
    small: true,
    focus: true,
    value: $.value,
    icon: 'search',
    hide: a.hide,
    change: a.change,
    select: a.select,
  })

])

const ui = app({ name: 'buffer-search', state, actions, view })

action('buffer-search', ui.show)
