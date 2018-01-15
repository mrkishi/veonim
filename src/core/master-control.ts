import { asColor, ID, log, onFnCall, merge, prefixWith } from '../support/utils'
import NeovimUtils, { CmdGroup, FunctionGroup } from '../support/neovim-utils'
import { NotifyKind, notify as notifyUI } from '../ui/notifications'
import CreateTransport from '../messaging/transport'
import { ChildProcess } from 'child_process'
import { Api, Prefixes } from '../core/api'
import SetupRPC from '../messaging/rpc'
import Neovim from '@veonim/neovim'
import { homedir } from 'os'

type RedrawFn = (m: any[]) => void
type ExitFn = (id: number, code: number) => void

interface VimColor {
  background: number,
  foreground: number,
}

interface VimInstance {
  id: number,
  proc: ChildProcess,
  attached: boolean,
  path?: string,
}

export interface NewVimResponse {
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

let onExitFn: ExitFn = function () {}
const prefix = prefixWith(Prefixes.Core)
const vimInstances = new Map<number, VimInstance>()
const { encoder, decoder } = CreateTransport()
const startup = FunctionGroup()

const startupCmds = CmdGroup`
  let $PATH .= ':${__dirname}/runtime/${process.platform}'
  let g:veonim = 1
  let g:vn_loaded = 0
  let g:vn_cmd_completions = ''
  let g:vn_rpc_buf = []
  let g:vn_platform = '${process.platform}'
  let g:vn_events = {}
  let g:vn_callbacks = {}
  let g:vn_callback_id = 0
  set laststatus=0
  set shortmess+=Ic
  set noshowcmd
  set noshowmode
  set noruler
  set nocursorline
  call serverstart()
`

startup.defineFunc.Veonim`
  if g:vn_loaded
    call rpcnotify(0, 'veonim', a:1, a:000[1:])
  else
    call add(g:vn_rpc_buf, a:000)
  endif
`

startup.defineFunc.VeonimCmdCompletions`
  return g:vn_cmd_completions
`

// TODO: figure out how to add multiple fn lambdas but dedup'd! (as a Set)
// index(g:vn_events[a:1], a:2) < 0 does not work
startup.defineFunc.VeonimRegisterEvent`
  let g:vn_events[a:1] = a:2
`

startup.defineFunc.VeonimCallEvent`
  if has_key(g:vn_events, a:1)
    let Func = g:vn_events[a:1]
    call Func()
  endif
`

startup.defineFunc.VeonimCallback`
  if has_key(g:vn_callbacks, a:1)
    let Funky = g:vn_callbacks[a:1]
    call Funky(a:2)
  endif
`

startup.defineFunc.VeonimRegisterMenuCallback`
  let g:vn_callbacks[a:1] = a:2
`

startup.defineFunc.VeonimMenu`
  let g:vn_callback_id += 1
  call VeonimRegisterMenuCallback(g:vn_callback_id, a:3)
  call Veonim('user-menu', g:vn_callback_id, a:1, a:2)
`

startup.defineFunc.VK`
  call VeonimRegisterEvent('key:' . a:2 . ':' . a:1, a:3)
  call Veonim('register-shortcut', a:1, a:2)
`

const spawnVimInstance = () => Neovim([
  '--cmd',
  `${startupCmds} | ${startup.funcs}`,
  '--cmd',
  `com! -nargs=* Plug 1`,
  '--cmd',
  `com! -nargs=+ -range -complete=custom,VeonimCmdCompletions Veonim call Veonim(<f-args>)`,
  '--embed'
], { cwd: homedir() })

const createNewVimInstance = (): number => {
  const proc = spawnVimInstance()
  const id = ids.vim.next()

  vimInstances.set(id, { id, proc, attached: false })

  proc.on('error', e => log `vim ${id} err ${e}`)
  proc.stdout.on('error', e => log `vim ${id} stdout err ${(JSON.stringify(e))}`)
  proc.stdin.on('error', e => log `vim ${id} stdin err ${(JSON.stringify(e))}`)
  proc.on('exit', c => onExitFn(id, c))

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

export const create = async ({ askCd = false } = {}): Promise<NewVimResponse> => {
  const id = createNewVimInstance()
  switchTo(id)
  const errors = await unblock()

  if (errors.length) notifyUI(errors.join('\n'), NotifyKind.Error)

  api.command(`let g:vn_loaded = 1`)
  api.command(`set laststatus=0`)
  api.command(`set nocursorline`)
  api.command(`set shortmess+=Ic`)
  api.command(`set noshowmode`)
  api.command(`set noshowcmd`)
  api.command(`set noruler`)

  // TODO: why not just ask for dir BEFORE creating new vim instance then inject :cd cmd with chosen dir?
  // TODO: this doesn't always work
  // TODO: there should be a more deterministic way to do this. i tried VimEnter autocmd but...
  askCd && setTimeout(() => api.command(`doautocmd <nomodeline> User VeonimStartupDir`), 11)

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

export const resize = (width: number, height: number) => {
  merge(clientSize, { width, height })
  if (ids.activeVim > -1) api.uiTryResize(width, height)
}

export const getColor = async (id: number) => {
  const { foreground, background } = await req.getHlById(id, true) as VimColor
  return {
    fg: asColor(foreground || 0),
    bg: asColor(background || 0),
  }
}
