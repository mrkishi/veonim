import SessionTransport from '../messaging/session-transport'
import WorkerClient from '../messaging/worker-client'
import SetupRPC from '../messaging/rpc'
import Neovim from '../neovim/api'

const { send, connectTo, switchTo, onRecvData } = SessionTransport()
const { onData, ...rpcAPI } = SetupRPC(send)
const { on } = WorkerClient()

onRecvData(([ type, d ]) => onData(type, d))

on.sessionCreate((id: number, path: string) => connectTo({ id, path }))
on.sessionSwitch((id: number) => switchTo(id))

export default Neovim({
  ...rpcAPI,
  onCreateVim: on.sessionCreate,
  onSwitchVim: on.sessionSwitch,
})
