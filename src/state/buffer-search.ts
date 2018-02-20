import { on, initState, go } from '../state/trade-federation'
import { current as vim } from '../core/neovim'
import { finder } from '../ai/update-server'

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

on.updateBufferSearchQuery((s, query) => {
  s.bufferSearch.value = query
  finder.request.query(vim.cwd, vim.file, query).then(go.updateBufferSearchOptions)
})

on.updateBufferSearchOptions((s, options) => s.bufferSearch.options = options)
on.showBufferSearch(s => s.bufferSearch.visible = true)
on.hideBufferSearch(s => s.bufferSearch.visible = false)
