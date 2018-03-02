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

const searchInBuffer = (query: string, results: FilterResult[]) => {
  const visibleRows = 24
  if (!results.length) return

  const range = {
    top: results[0].start.line,
    end: results[0].start.line + visibleRows,
  }

  const substrings = results.map(m => m.line.slice(m.start.column, m.end.column + 1))
  const parts = [...new Set(substrings)].filter(m => m).map(m => m.replace(/[\*\/\^\$\.\~\&]/g, '\\$&'))

  // TODO: parts slice only to visible region. if none in visible, only then expand more

  // TODO: ONLY USE PATTERN IF QUERY NOT FOUND IN BUFFER!
  //
  // using vim search() only works forwards or backwards from current cursor, but i want to search
  // visible buffer. so i think we will need to implement our own search in js via web worker.
  // use for loop to search for first occurange in line, otherwise exit early
  // or maybe try regex if faster? or regex per line?
  const pattern = parts.length ? parts.join('\\|') : query

  const searchQuery = `/\\%>${range.top}l\\%<${range.end}l${pattern}`
  console.log('qry:', searchQuery)
  cmd(searchQuery)
}

on.updateBufferSearchQuery((s, query) => {
  s.bufferSearch.value = query
  finder.request.query(vim.cwd, vim.file, query).then((results: FilterResult[]) => {
    searchInBuffer(query, results)
    go.updateBufferSearchOptions(results.map(m => m.line))
  })
})

on.updateBufferSearchOptions((s, options) => s.bufferSearch.options = options)
on.showBufferSearch(s => s.bufferSearch.visible = true)
on.hideBufferSearch(s => s.bufferSearch.visible = false)
