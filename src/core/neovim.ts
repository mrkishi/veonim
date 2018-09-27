import { onCreateVim, onSwitchVim } from '../core/sessions'
import setupRPC from '../messaging/rpc'
import Neovim from '../neovim/api'
import TextDocumentManager from '../neovim/text-document-manager'

export { NeovimState } from '../neovim/state'

const io = new Worker(`${__dirname}/../workers/neovim-client.js`)
const { onData, ...rpcAPI } = setupRPC(m => io.postMessage(m))
io.onmessage = ({ data: [kind, data] }: MessageEvent) => onData(kind, data)

onCreateVim(info => io.postMessage([65, info]))
onSwitchVim(id => io.postMessage([66, id]))

export default Neovim({ ...rpcAPI, onCreateVim, onSwitchVim })

const tdm = TextDocumentManager()

tdm.on.didOpen(doc => {
  console.log('document opened:', doc)
})

tdm.on.didChange(doc => {
  console.log('document chagned:', doc)
})

tdm.on.willSave(doc => {
  console.log('document will save:', doc)
})

tdm.on.didSave(doc => {
  console.log('document did save:', doc)
})
