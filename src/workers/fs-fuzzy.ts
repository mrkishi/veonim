import { NewlineSplitter } from '../utils'
import { filter as fuzzy } from 'fuzzaldrin-plus'
import Ripgrep from '@veonim/ripgrep'
import WorkerClient from '../worker-client'

const INTERVAL = 250
const AMOUNT = 10
const TIMEOUT = 15e3
const { on, call } = WorkerClient()
let results: string[] = []
let stopSearch = () => {}
let query = ''

const sendResults = ({ filter = true } = {}) => call.results(filter && query
  ? fuzzy(results, query).slice(0, AMOUNT)
  : results.slice(0, AMOUNT)
)

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
    call.done()
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
  return () => (stop(), reset())
}

on.stop(() => stopSearch())
on.load((cwd: string) => {
  console.log('pls load files for cwd:', cwd)
  stopSearch = getFiles(cwd)
})
on.query((data: string) => (query = data, sendResults()))
