import { filter as fuzzy, match } from 'fuzzaldrin-plus'
import { on, request } from '../messaging/worker-client'

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

const buffers = new Map<string, string[]>()

const getLocations = (str: string, query: string, buffer: string[]) => {
  const line = buffer.indexOf(str)
  const locations = match(str, query)

  return {
    start: { line, column: locations[0] },
    end: { line, column: locations[locations.length - 1] },
  }
}

const asFilterResults = (results: string[], lines: string[], query: string): FilterResult[] => [...new Set(results)]
  .map(m => ({
    line: m,
    ...getLocations(m, query, lines),
  }))

// TODO: deprecate
// on.set((file: string, buffer: string[]) => buffers.set(file, buffer))

on.fuzzy(async (file: string, query: string, max?: number): Promise<FilterResult[]> => {
  const bufferData = buffers.get(file) || []
  const results = fuzzy(bufferData, query, { maxResults })
  return asFilterResults(results, bufferData, query)
})

// TODO: is it really that much work to search on a few hundred lines max
// on the main thread? realisticly a buffer might be vertically max 100-200
// lines (if you have high res and low font size). would it kill the main
// thread to just do the fuzzy on main thread? also we don't need to query
// the nvim api for visible lines. we already have them in the render-grid
// buffer. see divination for how we get visible lines from grid.
on.visibleFuzzy(async (query: string): Promise<FilterResult[]> => {
  // TODO: this is the inevitable result of moving neovim
  // to its own dedicated worker thread: other web workers
  // can't use the neovim api.
  return nvim.current.buffer.getLines(nvim.state.editorTopLine, nvim.state.editorBottomLine)
  const visibleLines = await request.getVisibleLines() as string[]
  const results = fuzzy(visibleLines, query)
  return asFilterResults(results, visibleLines, query)
})
