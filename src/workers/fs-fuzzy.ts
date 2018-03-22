import WorkerClient from '../messaging/worker-client'
import { NewlineSplitter } from '../support/utils'
import { filter as fuzzy } from 'fuzzaldrin-plus'
import Ripgrep from '@veonim/ripgrep'
import { spawn } from 'child_process'

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

const getGitFiles = (cwd: string) => {
  const proc = spawn('git', ['ls-files'], { cwd, shell: true })
  proc.stdout.pipe(new NewlineSplitter()).on('data', (path: string) => {
    // console.log('@', path)
  })
}

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
// on.load((cwd: string) => stopSearch = getFiles(cwd))
on.load((cwd: string) => {
  stopSearch = getFiles(cwd)
  getGitFiles(cwd)
})
on.query((data: string) => (query = data, sendResults()))
