import { NewlineSplitter } from '../utils'
import { filter } from 'fuzzaldrin-plus'
import Ripgrep from '@veonim/ripgrep'

interface Result { path: string, line: number, col: number, text: string }
const INTERVAL = 250
const AMOUNT = 10
const TIMEOUT = 10e3
let results: Result[] = []
let filterQuery = ''

const sendResults = () => postMessage(['results', filterQuery
  ? filter(results, filterQuery, { key: 'path' }).slice(0, AMOUNT)
  : results.slice(0, AMOUNT)
])

const searchFiles = ({ query, cwd }: { query: string, cwd: string }) => {
  results = []
  filterQuery = ''
  let alive = true
  const timer = setInterval(() => sendResults(), INTERVAL)
  const rg = Ripgrep([query, '--vimgrep'], { cwd })

  // because you probably ran a query wayyy too big and now your system is hanging...
  setTimeout(() => alive && rg.kill(), TIMEOUT)

  rg.stdout.pipe(NewlineSplitter()).on('data', (m: string) => {
    const [ , path = '', line = 0, col = 0, text = '' ] = m.match(/^(.*?):(\d+):(\d+):(.*?)$/) || []
    path && results.push({ path, text, line: <any>line-0, col: <any>col-0 })
  })

  rg.on('exit', () => {
    alive = false
    clearInterval(timer)
    sendResults()
    postMessage(['done'])
  })

  setImmediate(() => sendResults())
  return () => alive && rg.kill()
}

onmessage = ({ data: [e, data] }: MessageEvent) => {
  let stopSearch = () => {}
  if (e === 'stop') return stopSearch()
  if (e === 'query') return (stopSearch(), stopSearch = searchFiles(data))
  if (e === 'filter') return (filterQuery = data, sendResults())
}
