import { Problem, setProblems } from '../ai/diagnostics'
import HttpServer from '../support/http-server'
import { cmd } from '../core/neovim'

HttpServer(42325).then(({ port, onJsonRequest }) => {
  process.env.VEONIM_REMOTE_PROBLEMS_PORT = port + ''
  cmd(`let $VEONIM_REMOTE_PROBLEMS_PORT='${port}'`)
  onJsonRequest<Problem[]>((data, reply) => (setProblems(data), reply(201)))
})
