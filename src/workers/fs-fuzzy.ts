import { NewlineSplitter } from '../utils'
import { filter as fuzzy } from 'fuzzaldrin-plus'
import Ripgrep from '@veonim/ripgrep'

const INTERVAL = 250
const AMOUNT = 10
const TIMEOUT = 15e3
let results: string[] = []
let query = ''

const sendResults = ({ filter = true } = {}) => postMessage(['results', filter && query
  ? fuzzy(results, query).slice(0, AMOUNT)
  : results.slice(0, AMOUNT)
])

const getFiles = (cwd: string) => {
  results = []
  query = ''
  let alive = true
  let initialSent = false
  const timer = setInterval(sendResults, INTERVAL)
  const rg = Ripgrep(['--files'], { cwd })

  rg.stdout.pipe(new NewlineSplitter()).on('data', (path: string) => {
    if (!initialSent && results.length >= AMOUNT) (initialSent = true, sendResults({ filter: false }))
    results.push(path)
  })

  rg.on('exit', () => {
    alive = false
    if (!initialSent) (initialSent = true, sendResults({ filter: false }))
    clearInterval(timer)
    sendResults()
    postMessage(['done'])
  })

  const stop = () => {
    if (alive) rg.kill()
    clearInterval(timer)
  }
  
  const reset = () => {
    query = ''
    results = []
  }

  setImmediate(() => sendResults({ filter: false }))
  setTimeout(stop, TIMEOUT)
  return () => stop() & reset()
}

onmessage = ({ data: [e, data] }: MessageEvent) => {
  let stopSearch = () => {}
  if (e === 'stop') return stopSearch()
  if (e === 'load') return (stopSearch = getFiles(data))
  if (e === 'query') return (query = data, sendResults())
}
