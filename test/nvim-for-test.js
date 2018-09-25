'use strict'

const { src } = require('./util')
const msgpack = require('msgpack-lite')

module.exports = () => {
  const { Neovim } = src('support/binaries')
  const CreateTransport = src('messaging/transport').default
  const SetupRPC = src('messaging/rpc').default
  let id = 1

  const proc = src('support/binaries').Neovim.run([
    '--cmd', `let g:veonim = 1 | let g:vn_loaded = 0 | let g:vn_ask_cd = 0`,
    '--cmd', `exe ":fun! Veonim(...)\\n endfun"`,
    '--cmd', `exe ":fun! VK(...)\\n endfun"`,
    '--cmd', `com! -nargs=+ -range Veonim 1`,
    '--cmd', 'com! -nargs=* Plug 1',
    '--cmd', `com! -nargs=* VeonimExt 1`,
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
    shutdown,
    notify: (name, ...args) => notify(`nvim_${name}`, args),
    request: (name, ...args) => request(`nvim_${name}`, args),
  }
}
