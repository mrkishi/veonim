import { createWriteStream } from 'fs'

const logger = createWriteStream('logs')
const logmsg = (m: string) => logger.write(`${JSON.stringify(m)}\n`)
//const log = (str: TemplateStringsArray, ...v: any[]) => logmsg(str.map((s, ix) => s + (v[ix] || '')).join(''))
const log = (str: TemplateStringsArray, ...v: any[]) => [str, v]

process.on('unhandledRejection', logmsg)

export { log }
