import HttpServer from '../support/http-server'
import current from '../neovim/state'
import { relative, join } from 'path'
import { cmd } from '../core/neovim'

interface RemoteRequest { cwd: string, file: string }

const load = async ({ cwd, file }: RemoteRequest) => {
  if (!file) return
  const vimCwd = current.cwd
  const base = cwd.includes(vimCwd) ? relative(vimCwd, cwd) : cwd
  const path = join(base, file)
  cmd(`e ${path}`)
}

HttpServer(42320).then(({ port, onJsonRequest }) => {
  process.env.VEONIM_REMOTE_PORT = port + ''
  cmd(`let $VEONIM_REMOTE_PORT='${port}'`)
  onJsonRequest<RemoteRequest>((data, reply) => (load(data), reply(201)))
})
