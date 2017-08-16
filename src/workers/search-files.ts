import { NewlineSplitter } from '../utils'
import { filter } from 'fuzzaldrin-plus'
import Ripgrep from '@veonim/ripgrep'

interface Result { path: string, line: number, col: number, text: string }
const INTERVAL = 250
const AMOUNT = 10
let results: Result[] = []
let filterQuery = ''

const sendResults = ({ noFilter = false } = {}) => postMessage(['results', !noFilter && filterQuery
  ? filter(results, filterQuery, { key: 'path' }).slice(0, AMOUNT)
  : results.slice(0, AMOUNT)
])

const searchFiles = ({ query, cwd }: { query: string, cwd: string }) => {
  results = []
  filterQuery = ''
  let alive = true
  let initialSent = false
  const timer = setInterval(() => sendResults(), INTERVAL)
  const rg = Ripgrep([query], { cwd })

  rg.stdout.pipe(NewlineSplitter()).on('data', (m: string) => {
    if (!initialSent && results.length >= AMOUNT) (initialSent = true, sendResults({ noFilter: true }))
    const [ , path = '', line = 0, col = 0, text = '' ] = m.match(/^(.*?):(\d+):(\d+):(.*?)$/) || []
    results.push({ path, text, line: <any>line-0, col: <any>col-0 })
  })

  rg.on('exit', () => {
    alive = false
    if (!initialSent) (initialSent = true, sendResults({ noFilter: true }))
    clearInterval(timer)
    sendResults()
    postMessage(['done'])
  })

  setImmediate(() => sendResults({ noFilter: true }))
  return () => alive && rg.kill()
}

onmessage = ({ data: [e, data] }: MessageEvent) => {
  let stopSearch = () => {}
  if (e === 'stop') return stopSearch()
  if (e === 'query') return (stopSearch(), stopSearch = searchFiles(data))
  if (e === 'filter') return (filterQuery = data, sendResults())
}
