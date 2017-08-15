import { NewlineSplitter } from '../utils'
import { filter } from 'fuzzaldrin-plus'
import Ripgrep from '@veonim/ripgrep'

let results: string[] = []
let query: string = ''

const sendResults = ({ ignoreQuery = false } = {}) => postMessage(['results', !ignoreQuery && query
  ? filter(results, query).slice(0, 10)
  : results.slice(0, 10)
])

const getFiles = (dir: string) => {
  results = []
  query = ''
  let alive = true
  let initialSent = false
  const timer = setInterval(() => sendResults(), 250)
  const rg = Ripgrep(['--files'], { cwd: dir })

  rg.stdout.pipe(NewlineSplitter()).on('data', (path: string) => {
    if (!initialSent && results.length > 9) (initialSent = true, sendResults({ ignoreQuery: true }))
    results.push(path)
  })

  rg.on('exit', () => {
    alive = false
    if (!initialSent) (initialSent = true, sendResults({ ignoreQuery: true }))
    clearInterval(timer)
    sendResults()
    postMessage(['done'])
  })

  setImmediate(() => sendResults({ ignoreQuery: true }))
  return () => alive && rg.kill()
}

onmessage = ({ data: [e, arg] }: MessageEvent) => {
  let stopSearch = () => {}
  if (e === 'load') stopSearch = getFiles(arg)
  else if (e === 'stop') stopSearch()
  else if (e === 'query') (query = arg, sendResults())
}
