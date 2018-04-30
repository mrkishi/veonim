import { delay, pascalCase, onProp } from '../support/utils'
import { Range } from 'vscode-languageserver-types'
import { Api } from '../core/api'

export type DefineFunction = { [index: string]: (fnBody: TemplateStringsArray, ...vars: any[]) => void }

export interface FontOption {
  font?: string,
  size?: string,
}

interface VimMode {
  blocking: boolean,
  mode: string,
}

// TODO: this getMode/blocking/input/capture :messages is kinda hack.
// when neovim implements external dialogs, please revisit
const unblock = (notify: Api, request: Api) => (): Promise<string[]> => new Promise(fin => {
  let neverGonnaGiveYouUp = false
  const typescript_y_u_do_dis = (): Promise<VimMode> => request.getMode() as Promise<VimMode>

  const timer = setTimeout(() => {
    neverGonnaGiveYouUp = true // never gonna let you down
    fin([])
  }, 2e3)

  const tryToUnblock = () => typescript_y_u_do_dis().then(mode => {
    if (!mode.blocking) {
      Promise.race([
        request.commandOutput('messages').then(m => m.split('\n').filter(m => m)),
        delay(250).then(() => [])
      ]).then(fin)

      clearInterval(timer)
      return
    }

    notify.input(`<Enter>`)
    if (!neverGonnaGiveYouUp) setImmediate(() => tryToUnblock())
  })

  tryToUnblock()
})

export default ({ notify, request }: { notify: Api, request: Api }) => ({
  unblock: unblock(notify, request)
})

export const FunctionGroup = () => {
  const fns: string[] = []

  const defineFunc: DefineFunction = onProp((name: PropertyKey) => (strParts: TemplateStringsArray, ...vars: any[]) => {
    const expr = strParts
      .map((m, ix) => [m, vars[ix]].join(''))
      .join('')
      .split('\n')
      .filter(m => m)
      .map(m => m.trim())
      .join('\\n')
      .replace(/"/g, '\\"')

    fns.push(`exe ":fun! ${pascalCase(name as string)}(...) range\\n${expr}\\nendfun"`)
  })

  return {
    defineFunc,
    get funcs() { return fns.join(' | ') }
  }
}

export const CmdGroup = (strParts: TemplateStringsArray, ...vars: any[]) => strParts
  .map((m, ix) => [m, vars[ix]].join(''))
  .join('')
  .split('\n')
  .filter(m => m)
  .map(m => m.trim())
  .map(m => m.replace(/\|/g, '\\|'))
  .join(' | ')
  .replace(/"/g, '\\"')

const fontFormattings = ['b', 'i', 'u', 's']

export const parseFont = (shittyvimshit: string): FontOption => {
  if (!shittyvimshit) return {}
  const parts = shittyvimshit.split(':')
  const size = parts.find(m => /(h\d+)/.test(m))
  const font = parts.find(m => !/([h|w|c]\d+)/.test(m) && !fontFormattings.includes(m))
  return { font, size }
}

export const positionWithinRange = (line: number, column: number, { start, end }: Range): boolean => {
  const startInRange = line >= start.line
    && (line !== start.line || column >= start.character)

  const endInRange = line <= end.line
    && (line !== end.line || column <= end.character)

  return startInRange && endInRange
}
