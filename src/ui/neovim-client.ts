import { Neovim } from '../neovim'
import Channel from '../channel'
import { onFnCall, onProp, pascalCase } from '../utils'
import { Functions } from '../functions'

const io = new Worker(`${__dirname}/../workers/io.js`)
const { on, sub, Notifier, Requester, onRecv } = Channel((e, msg, id) => io.postMessage([ e, msg, id ]))
io.onmessage = onRecv

export { on, sub }
export const notify = Notifier<Neovim>()
export const request = Requester<Neovim>()
export const call: Functions = onFnCall((name, args) => request.call(name, args))

const { cmd } = notify

type DefineFunction = { [index: string]: (fnBody: TemplateStringsArray) => void }

export const define: DefineFunction = onProp((name: string) => (fn: TemplateStringsArray) => {
  const expr = fn[0]
    .split('\n')
    .filter(m => m)
    .join('\\n')
    .replace(/"/g, '\\"')

  cmd(`exe ":fun! ${pascalCase(name)}(...) range\n${expr}\nendfun"`)
})