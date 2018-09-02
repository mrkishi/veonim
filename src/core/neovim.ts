import { onCreateVim, onSwitchVim } from '../core/sessions'
import setupRPC from '../messaging/rpc'

export { NeovimState } from '../neovim/state'


const io = new Worker(`${__dirname}/../workers/neovim-client.js`)
const { notify, request, onEvent, onData } = setupRPC(m => io.postMessage(m))
io.onmessage = ({ data: [kind, data] }: MessageEvent) => onData(kind, data)

onCreateVim(info => io.postMessage([65, info]))
onSwitchVim(id => io.postMessage([66, id]))

// TODO: what are the inputs here?

export default NeovimApi()
