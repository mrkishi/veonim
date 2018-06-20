import { filter as fuzzy, match } from 'fuzzaldrin-plus'
import WorkerClient from '../messaging/worker-client'
import { current, expr } from '../core/neovim'
import { join } from 'path'

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

const { on } = WorkerClient()
const buffers = new Map<string, string[]>()

const getLocations = (str: string, query: string, buffer: string[]) => {
  const line = buffer.indexOf(str)
  const locations = match(str, query)

  return {
    start: { line, column: locations[0] },
    end: { line, column: locations[locations.length - 1] },
  }
}

const filter = (cwd: string, file: string, query: string, maxResults = 20): FilterResult[] => {
  const bufferData = buffers.get(join(cwd, file)) || []
  const results = fuzzy(bufferData, query, { maxResults })

  return [...new Set(results)]
    .map(m => ({
      line: m,
      ...getLocations(m, query, bufferData),
    }))
}

on.set((cwd: string, file: string, buffer: string[]) => buffers.set(join(cwd, file), buffer))

on.fuzzy(async (cwd: string, file: string, query: string, max?: number): Promise<FilterResult[]> => {
  return filter(cwd, file, query, max)
})

on.visibleFuzzy(async (query: string) => {
  // TODO: can't require electron in workers apparently?
  // how can we make neovim be self-contained and not
  // pull in electron and other global shit?

  const [ start, end ] = await Promise.all([
    expr(`line('w0')`),
    expr(`line('w$')`),
  ])

  const visibleLines = await current.buffer.getLines(start, end)
  const results = fuzzy(visibleLines, query)
  return [...new Set(results)]
})
