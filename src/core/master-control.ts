import { asColor, ID, log, onFnCall, merge, prefixWith } from '../support/utils'
import { NotifyKind, notify as notifyUI } from '../ui/notifications'
import { startupFuncs, startupCmds } from '../core/vim-startup'
import CreateTransport from '../messaging/transport'
import NeovimUtils from '../support/neovim-utils'
import { Neovim } from '../support/binaries'
import { ChildProcess } from 'child_process'
import { Api, Prefixes } from '../core/api'
import SetupRPC from '../messaging/rpc'
import { Color } from '../neovim/types'
import { homedir } from 'os'

type RedrawFn = (m: any[]) => void
type ExitFn = (id: number, code: number) => void

interface VimInstance {
  id: number,
  proc: ChildProcess,
  attached: boolean,
  path?: string,
}

interface NewVimResponse {
  id: number,
  path: string,
}

const vimOptions = {
  rgb: true,
  ext_popupmenu: true,
  ext_tabline: true,
  ext_wildmenu: true,
  ext_cmdline: true,
  ext_messages: true,
}

const ids = {
  vim: ID(),
  activeVim: -1,
}

const clientSize = {
  width: 0,
  height: 0,
}

let onExitFn: ExitFn = () => {}
const prefix = prefixWith(Prefixes.Core)
const vimInstances = new Map<number, VimInstance>()
const { encoder, decoder } = CreateTransport()

const spawnVimInstance = () => Neovim.run([
  '--cmd', `${startupFuncs()} | ${startupCmds}`,
  '--cmd', `com! -nargs=* Plug 1`,
  '--cmd', `com! -nargs=* VeonimExt 1`,
  '--cmd', `com! -nargs=+ -range -complete=custom,VeonimCmdCompletions Veonim call Veonim(<f-args>)`,
  '--embed'
], {
  cwd: homedir(),
  env: {
    ...process.env,
    VIM: Neovim.path,
    VIMRUNTIME: Neovim.runtime,
  },
})

const createNewVimInstance = (): number => {
  const proc = spawnVimInstance()
  const id = ids.vim.next()

  vimInstances.set(id, { id, proc, attached: false })

  proc.on('error', (e: any) => log `vim ${id} err ${e}`)
  proc.stdout.on('error', (e: any) => log `vim ${id} stdout err ${(JSON.stringify(e))}`)
  proc.stdin.on('error', (e: any) => log `vim ${id} stdin err ${(JSON.stringify(e))}`)
  proc.on('exit', (c: any) => onExitFn(id, c))

  return id
}

export const switchTo = (id: number) => {
  if (!vimInstances.has(id)) return
  const { proc, attached } = vimInstances.get(id)!

  if (ids.activeVim > -1) {
    encoder.unpipe()
    vimInstances.get(ids.activeVim)!.proc.stdout.unpipe()
  }

  encoder.pipe(proc.stdin)
  // don't kill decoder stream when this stdout stream ends (need for other stdouts)
  proc.stdout.pipe(decoder, { end: false })
  ids.activeVim = id

  // sending resize (even of the same size) makes vim instance clear/redraw screen
  // this is how to repaint the UI with the new vim instance. not the most obvious...
  if (attached) api.uiTryResize(clientSize.width, clientSize.height)
}

export const create = async ({ dir } = {} as { dir?: string }): Promise<NewVimResponse> => {
  const id = createNewVimInstance()
  switchTo(id)
  const errors = await unblock()

  if (errors.length) {
    notifyUI(errors.join('\n'), NotifyKind.Error)
    if (process.env.VEONIM_DEV) errors.forEach(err => console.error(err))
  }

  // TODO: batch these?
  api.command(`let g:vn_loaded = 1`)
  api.command(`set laststatus=0`)
  api.command(`set nocursorline`)
  api.command(`set shortmess+=Ic`)
  api.command(`set noshowmode`)
  api.command(`set noshowcmd`)
  api.command(`set noruler`)

  dir && api.command(`cd ${dir}`)

  const path = await req.eval('v:servername')
  vimInstances.get(id)!.path = path
  return { id, path }
}

export const attachTo = (id: number) => {
  if (!vimInstances.has(id)) return
  const vim = vimInstances.get(id)!
  if (vim.attached) return
  api.uiAttach(clientSize.width, clientSize.height, vimOptions)
  vim.attached = true
}

const { notify, request, on: onEvent, onData } = SetupRPC(encoder.write)
decoder.on('data', ([type, ...d]: [number, any]) => onData(type, d))

const req: Api = onFnCall((name: string, args: any[] = []) => request(prefix(name), args))
const api: Api = onFnCall((name: string, args: any[]) => notify(prefix(name), args))

const { unblock } = NeovimUtils({ notify: api, request: req })

export const onExit = (fn: ExitFn) => { onExitFn = fn }
export const onRedraw = (fn: RedrawFn) => onEvent('redraw', fn)
export const input = (keys: string) => api.input(keys)
export const getMode = () => req.getMode() as Promise<{ mode: string, blocking: boolean }>

export const resize = (width: number, height: number) => {
  merge(clientSize, { width, height })
  if (ids.activeVim > -1) api.uiTryResize(width, height)
}

export const getColor = async (id: number) => {
  const { foreground, background } = await req.getHlById(id, true) as Color
  return {
    fg: asColor(foreground || 0),
    bg: asColor(background || 0),
  }
}
