import { on, initState, go } from '../state/trade-federation'
import { current as vim, cmd } from '../core/neovim'
import { finder } from '../ai/update-server'
import { merge } from '../support/utils'

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

export interface BufferSearch {
  value: string,
  options: string[],
  visible: boolean,
}

initState('bufferSearch', {
  options: [],
  visible: false,
  value: '',
} as BufferSearch)

export interface Actions {
  updateBufferSearchOptions: (options: string[]) => void,
  showBufferSearch: () => void,
  hideBufferSearch: () => void,
  updateBufferSearchQuery: (query: string) => void,
}

const getVisibleResults = (results: FilterResult[], start: number, end: number): FilterResult[] => {
  const visibleOnly = results.filter(m => m.start.line >= start && m.end.line <= end)
  return visibleOnly.length ? visibleOnly : results
}

const searchInBuffer = (query: string, results: FilterResult[], performVimSearch: boolean) => {
  if (!results.length || performVimSearch) {
    return query ? cmd(`/${query}`) : cmd(`noh`)
  }

  // TODO: get actual number of visibleRows
  const visibleRows = 23

  const range = {
    start: results[0].start.line,
    end: results[0].start.line + visibleRows,
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

on.updateBufferSearchQuery((s, query) => {
  s.bufferSearch.value = query
  finder.request.query(vim.cwd, vim.file, query).then((res: QueryResult) => {
    const { performVimSearch = true, results = [] } = res || {}
    searchInBuffer(query, results, performVimSearch)
    go.updateBufferSearchOptions(results.map(m => m.line))
  })
})

on.updateBufferSearchOptions((s, options) => s.bufferSearch.options = options)
on.showBufferSearch(s => merge(s.bufferSearch, { value: '', visible: true, options: [] }))
on.hideBufferSearch(s => merge(s.bufferSearch, { value: '', visible: false, options: [] }))
