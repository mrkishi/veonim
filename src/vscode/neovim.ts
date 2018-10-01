import SessionTransport from '../messaging/session-transport'
import { on } from '../messaging/worker-client'
import SetupRPC from '../messaging/rpc'
import Neovim from '../neovim/api'

const { send, connectTo, switchTo, onRecvData } = SessionTransport()
const { onData, ...rpcAPI } = SetupRPC(send)

onRecvData(([ type, d ]) => onData(type, d))

on.sessionCreate((m: any) => connectTo(m))
on.sessionSwitch((m: any) => switchTo(m))

export default Neovim({
  ...rpcAPI,
  onCreateVim: on.sessionCreate,
  onSwitchVim: on.sessionSwitch,
})
