import { cmd, cwdir } from '../neovim'
import { relative, join } from 'path'
import { createServer } from 'http'

const load = async ({ cwd, file }: { cwd: string, file: string }) => {
  if (!file) return
  const vimCwd = await cwdir()
  const base = cwd.includes(vimCwd) ? relative(vimCwd, cwd) : cwd
  const path = join(base, file)
  cmd(`e ${path}`)
}

createServer((req, res) => {
  let buf = ''
  req.on('data', m => buf += m)
  req.on('end', async () => { try { load(JSON.parse(buf)) } catch (e) {} })
  res.writeHead(200)
  res.end()
// TODO: port in use? will at least happen on release + debug concurrent
}).listen(process.env.NEOVIM_REMOTE_PORT || 42320)
