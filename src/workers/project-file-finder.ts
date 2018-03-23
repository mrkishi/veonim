import { NewlineSplitter, commandExists } from '../support/utils'
import WorkerClient from '../messaging/worker-client'
import { filter as fuzzy } from 'fuzzaldrin-plus'
import Ripgrep from '@veonim/ripgrep'
import { spawn } from 'child_process'

const INTERVAL = 250
const AMOUNT = 10
const TIMEOUT = 15e3
const { on, call } = WorkerClient()
const results = new Set<string>()
const cancelTokens = new Set<Function>()
let query = ''

const sendResults = ({ filter = true } = {}) => call.results(filter && query
  ? fuzzy([ ...results ], query).slice(0, AMOUNT)
  : [ ...results ].slice(0, AMOUNT)
)

const getFilesWithGit = (cwd: string) => {
  if (!commandExists('git')) return () => {}

  const git = spawn('git', ['ls-files'], { cwd, shell: true })
  git.stdout.pipe(new NewlineSplitter()).on('data', (path: string) => {
    if (!path.includes('node_modules')) results.add(path)
  })

  const reset = () => results.clear()
  const stop = () => git.kill()

  setTimeout(stop, TIMEOUT)
  return () => (stop(), reset())
}

const getFilesWithRipgrep = (cwd: string) => {
  const timer = setInterval(sendResults, INTERVAL)
  const rg = Ripgrep(['-g', '!node_modules', '--files'], { cwd })
  let initialSent = false

  rg.stdout.pipe(new NewlineSplitter()).on('data', (path: string) => {
    const shouldSendInitialBatch = !initialSent && results.size >= AMOUNT 
    results.add(path)

    if (shouldSendInitialBatch) {
      sendResults({ filter: false })
      initialSent = true
    }
  })

  rg.on('exit', () => {
    clearInterval(timer)
    sendResults({ filter: initialSent })
    call.done()
  })

  const reset = () => results.clear()
  const stop = () => {
    rg.kill()
    clearInterval(timer)
  }
  
  setImmediate(() => sendResults({ filter: false }))
  setTimeout(stop, TIMEOUT)
  return () => (stop(), reset())
}

on.load((cwd: string) => {
  results.clear()
  query = ''

  const stopRipgrepSearch = getFilesWithRipgrep(cwd)
  const stopGitSearch = getFilesWithGit(cwd)

  cancelTokens.add(stopRipgrepSearch)
  cancelTokens.add(stopGitSearch)
})

on.stop(() => {
  query = ''
  cancelTokens.forEach(cancel => cancel())
  cancelTokens.clear()
})

on.query((data: string) => {
  query = data
  sendResults()
})
