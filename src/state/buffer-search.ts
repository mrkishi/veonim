import { on, initState, go } from '../state/trade-federation'
import { current as vim, cmd } from '../core/neovim'
import { finder } from '../ai/update-server'

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

const searchInBuffer = (query: string, results: FilterResult[], performVimSearch: boolean) => {
  if (!results.length || performVimSearch) {
    return cmd(`/${query}`)
  }

  // TODO: get actual number of visibleRows
  const visibleRows = 24

  const range = {
    top: results[0].start.line,
    end: results[0].start.line + visibleRows,
  }

  // TODO: parts slice only to visible region. if none in visible, only then expand more
  const parts = results
    .map(m => m.line.slice(m.start.column, m.end.column + 1))
    .filter((m, ix, arr) => arr.indexOf(m) === ix)
    .filter(m => m)
    .map(m => m.replace(/[\*\/\^\$\.\~\&]/g, '\\$&'))

  const pattern = parts.length ? parts.join('\\|') : query

  const searchQuery = `/\\%>${range.top}l\\%<${range.end}l${pattern}`
  console.log('qry:', searchQuery)
  cmd(searchQuery)
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

on.showBufferSearch(s => {
  s.bufferSearch.value = ''
  s.bufferSearch.visible = true
})

on.hideBufferSearch(s => {
  s.bufferSearch.value = ''
  s.bufferSearch.visible = false
})
