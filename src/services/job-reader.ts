import { writeFile, uuid } from '../support/utils'
import { systemAction } from '../core/neovim'
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

const writeData = async (lines: string[]) => {
  const location = join(__dirname, '..', uuid())
  await writeFile(location, lines.join('\n'))
  return location
}

const parse = async (lines: string[], _format: ParserFormat) => {
  const filepath = await writeData(lines)
  const list = await formatter.request.getErrors(filepath, formats.get(ParserFormat.Typescript))

  // TODO: ok now we need to do a few things:
  // - figure out how to group job outputs into logical groupings... timeout based? wait for token
  // like 'build/compile done/success/etc?'
  // - need to cleanup the errorformat files generated
  //    either that, or need to queue output requests together so the file is "locked"
  //    to only one vim parsing request at a time
  console.log('list', [...list])
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

