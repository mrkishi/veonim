import { ex, cmd, cwdir } from '../neovim'
import { relative, join } from 'path'
import HttpServer from '../../http-server'

interface RemoteRequest {
  cwd: string,
  file: string,
}

const load = async ({ cwd, file }: RemoteRequest) => {
  if (!file) return
  const vimCwd = await cwdir()
  const base = cwd.includes(vimCwd) ? relative(vimCwd, cwd) : cwd
  const path = join(base, file)
  cmd(`e ${path}`)
}

HttpServer(42320).then(({ port, onJsonRequest }) => {
  process.env.VEONIM_REMOTE_PORT = port + ''
  ex(`let $VEONIM_REMOTE_PORT='${port}'`)
  onJsonRequest<RemoteRequest>((data, reply) => (load(data), reply(201)))
})
