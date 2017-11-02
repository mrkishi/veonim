import { NewlineSplitter } from '../utils'
import { filter } from 'fuzzaldrin-plus'
import Ripgrep from '@veonim/ripgrep'

interface Result { path: string, line: number, col: number, text: string }
interface ResultPart { line: number, col: number, text: string }
const INTERVAL = 250
const TIMEOUT = 10e3
let results: Result[] = []
let filterQuery = ''

const groupResults = (m: Result[]) => [...m.reduce((map, { path, text, line, col }: Result) => {
  if (!map.has(path)) return (map.set(path, [{ text, line, col }]), map)
  return (map.get(path)!.push({ text, line, col }), map)
}, new Map<string, ResultPart[]>())]

const sendResults = () => results.length && postMessage(['results', filterQuery
  ? groupResults(filter(results, filterQuery, { key: 'path' }))
  : groupResults(results)
])

const searchFiles = ({ query, cwd }: { query: string, cwd: string }) => {
  if (!query || !cwd) {
    postMessage(['done'])
    return () => {}
  }

  results = []
  filterQuery = ''
  let alive = true
  const timer = setInterval(() => sendResults(), INTERVAL)
  const rg = Ripgrep([query, '--vimgrep'], { cwd })

  rg.stdout.pipe(new NewlineSplitter()).on('data', (m: string) => {
    const [ , path = '', line = 0, col = 0, text = '' ] = m.match(/^(.*?):(\d+):(\d+):(.*?)$/) || []
    path && results.push({ path, text: text.trim(), line: <any>line-0, col: <any>col-0 })
  })

  rg.on('exit', () => {
    alive = false
    clearInterval(timer)
    sendResults()
    postMessage(['done'])
  })

  const stop = () => {
    if (alive) rg.kill()
    clearInterval(timer)
  }

  const reset = () => {
    filterQuery = ''
    results = []
  }

  // TODO: will the results disappear like in fs-fuzzy after timeout?
  setImmediate(() => sendResults())
  setTimeout(stop, TIMEOUT)
  return () => (stop(), reset())
}

onmessage = ({ data: [e, data] }: MessageEvent) => {
  let stopSearch = () => {}
  if (e === 'stop') return stopSearch()
  if (e === 'query') return (stopSearch(), stopSearch = searchFiles(data))
  if (e === 'filter') return (filterQuery = data, sendResults())
}
