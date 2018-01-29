import { writeFile, debounce } from '../support/utils'
import { systemAction } from '../core/neovim'
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
  console.log('destroying the queue', parsingQueue.length)
  const filepath = await writeData(parsingQueue)
  parsingQueue = []
  const list = await formatter.request.getErrors(filepath, formats.get(format))
  console.log('RES:', list)
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

