import neovim from '../neovim'
import Channel from '../channel'

const { publishApi, Notifier, onRecv } = Channel((e, msg, id) => postMessage([e, msg, id]))
onmessage = onRecv
publishApi(neovim)

const pub = Notifier()
neovim.on.redraw(m => pub.redraw(m))
neovim.on.exit((id, code) => pub.exit(id, code))