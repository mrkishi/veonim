import WorkerClient from '../messaging/worker-client'
import { NewlineSplitter } from '../support/utils'
import Ripgrep from '@veonim/ripgrep'

interface Request {
  query: string,
  cwd: string,
}

interface Result {
  path: string,
  line: number,
  col: number,
  text: string,
}

interface ResultPart {
  line: number,
  col: number,
  text: string,
}

const INCREMENT_AMOUNT = 50
const INTERVAL = 250
const TIMEOUT = 10e3
const { on, call } = WorkerClient()
const range = { start: 0, end: INCREMENT_AMOUNT * 2 }
let results: Result[] = []
let stopSearch = () => {}
let filterQuery = ''

const groupResults = (m: Result[]) => [...m.reduce((map, { path, text, line, col }: Result) => {
  if (!map.has(path)) return (map.set(path, [{ text, line, col }]), map)
  return (map.get(path)!.push({ text, line, col }), map)
}, new Map<string, ResultPart[]>())]

const sendResults = () => {
  if (!results.length) return

  const searchResults = filterQuery
    // in my testing it feels better to not fuzzy search on paths. not accurate enough
    //? fuzzy(results, filterQuery, { key: 'path' }).slice(range.start, range.end)
    ? results.filter(m => m.path.toLowerCase().includes(filterQuery)).slice(range.start, range.end)
    : results.slice(range.start, range.end)

  if (searchResults.length) {
    if (range.start > 0) call.moreResults(groupResults(searchResults))
    else call.results(groupResults(searchResults))
    return
  }

  range.start -= INCREMENT_AMOUNT
  range.end -= INCREMENT_AMOUNT
}

const searchFiles = ({ query, cwd }: Request) => {
  if (!query || !cwd) {
    call.done()
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
    call.done()
  })

  const stop = () => {
    if (alive) rg.kill()
    clearInterval(timer)
  }

  const reset = () => {
    filterQuery = ''
    results = []
    range.start = 0
    range.end = INCREMENT_AMOUNT * 2
  }

  setImmediate(() => sendResults())
  setTimeout(stop, TIMEOUT)
  return () => (stop(), reset())
}

on.stop(() => stopSearch())

on.query((req: Request) => {
  stopSearch()
  stopSearch = searchFiles(req)
})

on.filter((query: string) => {
  filterQuery = query
  sendResults()
})

on.loadNext(() => {
  range.start += INCREMENT_AMOUNT
  range.end += INCREMENT_AMOUNT

  // TODO: VERY BAD! because fuzzy will run again over the same query
  // a little tricky to figure out because need to figure out cache result invalidation
  sendResults()
})
