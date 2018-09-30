'use strict'

const { src } = require('./util')
const msgpack = require('msgpack-lite')

module.exports = () => {
  const { Neovim } = src('support/binaries')
  const { startupFuncs, startupCmds } = src('core/vim-startup')
  const CreateTransport = src('messaging/transport').default
  const SetupRPC = src('messaging/rpc').default
  let id = 1

  const proc = src('support/binaries').Neovim.run([
    '--cmd', `${startupFuncs()} | ${startupCmds}`,
    '--cmd', `com! -nargs=* Plug 1`,
    '--cmd', `com! -nargs=* VeonimExt 1`,
    '--cmd', `com! -nargs=+ -range -complete=custom,VeonimCmdCompletions Veonim call Veonim(<f-args>)`,
    '--embed'
  ], {
    ...process.env,
    VIM: Neovim.path,
    VIMRUNTIME: Neovim.runtime,
  })

  const { encoder, decoder } = CreateTransport()
  encoder.pipe(proc.stdin)
  proc.stdout.pipe(decoder)
  const { notify, request, onData } = SetupRPC(encoder.write)

  decoder.on('data', ([ type, ...d ]) => onData(type, d))

  const shutdown = () => proc.kill()

  return {
    proc,
    shutdown,
    notify: (name, ...args) => notify(`nvim_${name}`, args),
    request: (name, ...args) => request(`nvim_${name}`, args),
  }
}
