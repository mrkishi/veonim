import { action, systemAction, call, cmd, getCurrent } from '../core/neovim'
import { is, writeFile, debounce } from '../support/utils'
import * as dispatch from '../messaging/dispatch'
import { addQF } from '../ai/diagnostics'
import Worker from '../messaging/worker'
import { join } from 'path'

enum ParserFormat {
  Typescript,
}

const formatter = Worker('neovim-error-reader')

const formats = new Map([
  [ParserFormat.Typescript, `%f(%l\\\\\\,%c):\\ %t%*\\\\w\\ TS%n:\\ %m`],
])

// TODO: need to keep track of terminal job ids across sessions
const terminals = new Map<number, Set<number>>()
let activeSession = -1
dispatch.sub('session:switch', id => activeSession = id)

const bufferings = new Map<number, string[]>()
const buffer = (id: number, stuff: string[]) => bufferings.has(id)
  ? bufferings.get(id)!.push(...stuff)
  : bufferings.set(id, stuff)

let parsingQueue = [] as any[]

const writeData = async (lines: string[]) => {
  const location = join(__dirname, '..', 'errorz')
  await writeFile(location, lines.join('\n'))
  return location
}

const destroyQ = async (format: ParserFormat) => {
  const filepath = await writeData(parsingQueue)
  parsingQueue = []
  const list = await formatter.request.getErrors(filepath, formats.get(format))
  addQF(list)
}

const tryEmptyQ = debounce(destroyQ, 2e3)
const parseLater = (lines: string[], format: ParserFormat) => {
  parsingQueue.push(...lines)
  tryEmptyQ(format)
}

const parse = (lines: string[], format: ParserFormat) => {
  parseLater(lines, format)

  // TODO: ok now we need to do a few things:
  // - figure out how to group job outputs into logical groupings... timeout based? wait for token
  // like 'build/compile done/success/etc?'
}

systemAction('job-output', (jobId: number, data: string[]) => {
  const lastLine = data[data.length - 1]

  if (lastLine === '') {
    const prevMsg = bufferings.get(jobId) || []
    bufferings.delete(jobId)
    const msg = [...prevMsg, ...data]
    parse(msg, ParserFormat.Typescript)
  }

  else buffer(jobId, data)
})

action('TermAttach', async () => {
  const buffer = await getCurrent.buffer
  const jobId = await buffer.getVar('terminal_job_id')
  if (!is.number(jobId)) return

  cmd(`let g:vn_jobs_connected[${jobId}] = 1`)
  //cmd(`if b:terminal_job_id | let g:vn_jobs_connected[b:terminal_job_id] = 1 | endif`)
})

action('TermDetach', () => {
  cmd(`if b:terminal_job_id | call remove(g:vn_jobs_connected, b:terminal_job_id) | endif`)
})

action('TermOpen', (cmd = '/bin/bash') => call.termopen(cmd, {
  on_stdout: 'VeonimTermReader',
  on_exit: 'VeonimTermExit',
}))
