import { systemAction } from '../core/neovim'
import { shell } from '../support/utils'

enum ParserFormat {
  Typescript,
}

const parserPath = '/Users/a/go/bin/errorformat'
//const formats = new Map([
  //[ParserFormat.Typescript, `%E%f %#(%l\,%c): error %m,%E%f %#(%l\,%c): %m,%Eerror %m,%C%\s%\+%m`],
//])
//"set efm=%f(%l\\\,%c):\ %t%*\\w\ TS%n:\ %m

const bufferings = new Map<number, string[]>()
const buffer = (id: number, stuff: string[]) => bufferings.has(id)
  ? bufferings.get(id)!.push(...stuff)
  : bufferings.set(id, stuff)

const fuckgo = (text: string) => {
///path/to/F1.scala|203 col 13 warning 1234| local val in method f is never used: (warning smaple 3)

  const res = text.match(/^(\w+)|(\d+) col (\d+) (\w+) (\d+)| (\w+)/) || [] as any
  //const res = { path, line, col, type, typeNum, msg }
  console.log(res)
}

const parse = async (lines: string[], _format: ParserFormat) => {
  const p = lines.map(l => l.replace(/\r\n/, ''))
  //console.log('before', JSON.stringify(p))
  //const errformat = formats.get(format)
  // TODO: need to escape lines doublequotes
  p.forEach(async thing => {
    const results = await shell(`echo "${thing}" | ${parserPath} -name=tsc`)
    if (!results.startsWith('||')) {
      console.log('>>>:', results)
      fuckgo(results)
    }
  })
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

