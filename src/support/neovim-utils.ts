import { delay, pascalCase, onProp } from '../support/utils'
import { Api } from '../core/api'

export type DefineFunction = { [index: string]: (fnBody: TemplateStringsArray) => void }

interface VimMode {
  blocking: boolean,
  mode: string,
}

// TODO: this getMode/blocking/input/capture :messages is kinda hack.
// when neovim implements external dialogs, please revisit
const unblock = (notify: Api, request: Api) => (): Promise<string[]> => new Promise(fin => {
  let neverGonnaGiveYouUp = false

  const timer = setTimeout(() => {
    neverGonnaGiveYouUp = true // never gonna let you down
    fin([])
  }, 2e3)

  const tryToUnblock = () => request.getMode().then((mode: VimMode) => {
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
