import { delay, pascalCase, onProp } from './utils'
import { Api } from './api'

export type DefineFunction = { [index: string]: (fnBody: TemplateStringsArray) => void }

// TODO: this getMode/blocking/input/capture :messages is kinda hack.
// when neovim implements external dialogs, please revisit
const unblock = (api: Api, req: Api) => (): Promise<string[]> => new Promise(fin => {
  let neverGonnaGiveYouUp = false

  const timer = setTimeout(() => {
    neverGonnaGiveYouUp = true // never gonna let you down
    fin([])
  }, 2e3)

  const tryToUnblock = () => req.getMode().then(mode => {
    if (!mode.blocking) {
      Promise.race([
        req.commandOutput('messages').then(m => m.split('\n').filter(m => m)),
        delay(250).then(() => [])
      ]).then(fin)

      clearInterval(timer)
      return
    }

    api.input(`<Enter>`)
    if (!neverGonnaGiveYouUp) setImmediate(() => tryToUnblock())
  })

  tryToUnblock()
})

export default ({ api, req }: { api: Api, req: Api }) => ({
  unblock: unblock(api, req)
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
