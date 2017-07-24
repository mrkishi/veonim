import { Neovim } from '../neovim'
import Channel from '../channel'

const io = new Worker(`${__dirname}/../workers/io.js`)
const { on, Notifier, Requester, onRecv } = Channel((e, msg, id) => io.postMessage([ e, msg, id ]))
io.onmessage = onRecv

export { on }
export const notify = Notifier<Neovim>()
export const request = Requester<Neovim>()