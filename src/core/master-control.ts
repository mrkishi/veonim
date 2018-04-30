import { asColor, ID, log, onFnCall, merge, prefixWith } from '../support/utils'
import NeovimUtils, { CmdGroup, FunctionGroup } from '../support/neovim-utils'
import { WIN_INFO_INDICATOR, WIN_INFO_OFFSET } from '../support/constants'
import { NotifyKind, notify as notifyUI } from '../ui/notifications'
import Neovim, { vimpath, vimruntime } from '@veonim/neovim'
import { colorscheme } from '../config/default-configs'
import CreateTransport from '../messaging/transport'
import { ChildProcess } from 'child_process'
import { Api, Prefixes } from '../core/api'
import SetupRPC from '../messaging/rpc'
import { Color } from '../core/neovim'
import { resolve } from 'path'
import { homedir } from 'os'

type RedrawFn = (m: any[]) => void
type ExitFn = (id: number, code: number) => void

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

let onExitFn: ExitFn = () => {}
const prefix = prefixWith(Prefixes.Core)
const vimInstances = new Map<number, VimInstance>()
const { encoder, decoder } = CreateTransport()
const startup = FunctionGroup()
const runtimeDir = resolve(__dirname, '..', 'runtime')

const startupCmds = CmdGroup`
  let $VIM = '${vimpath}'
  let $VIMRUNTIME = '${vimruntime}'
  let &runtimepath .= ',${runtimeDir}'
  let $PATH .= ':${runtimeDir}/${process.platform}'
  let g:veonim = 1
  let g:vn_loaded = 0
  let g:vn_cmd_completions = ''
  let g:vn_rpc_buf = []
  let g:vn_platform = '${process.platform}'
  let g:vn_events = {}
  let g:vn_callbacks = {}
  let g:vn_callback_id = 0
  let g:vn_jobs_connected = {}
  colorscheme ${colorscheme}
  set guicursor=n:block-CursorNormal,i:hor10-CursorInsert,v:block-CursorVisual
  set background=dark
  set laststatus=2
  set statusline=%{VeonimStatusline()}
  set shortmess+=Ic
  set noshowcmd
  set noshowmode
  set noruler
  set nocursorline
  call serverstart()
`

startup.defineFunc.VeonimStatusline`
  let ctrl = nr2char(${WIN_INFO_INDICATOR})
  let id = nr2char(win_getid())
  let h = nr2char(winheight(id) + ${WIN_INFO_OFFSET})
  let w = nr2char(winwidth(id) + ${WIN_INFO_OFFSET})
  return ctrl.id.h.w
`

// TODO: internalize (private) these functions to plugin file?
startup.defineFunc.VeonimTermReader`
  if has_key(g:vn_jobs_connected, a:1)
    call rpcnotify(0, 'veonim', 'job-output', [a:1, a:2])
  endif
`

startup.defineFunc.VeonimTermExit`
  call remove(g:vn_jobs_connected, a:1)
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

startup.defineFunc.VeonimOverlayMenu`
  let g:vn_callback_id += 1
  call VeonimRegisterMenuCallback(g:vn_callback_id, a:3)
  call Veonim('user-overlay-menu', g:vn_callback_id, a:1, a:2)
`

startup.defineFunc.VK`
  call VeonimRegisterEvent('key:' . a:2 . ':' . a:1, a:3)
  call Veonim('register-shortcut', a:1, a:2)
`

const spawnVimInstance = () => Neovim([
  '--cmd', `${startupCmds} | ${startup.funcs}`,
  '--cmd', `com! -nargs=* Plug 1`,
  '--cmd', `com! -nargs=* VeonimExt 1`,
  '--cmd', `com! -nargs=+ -range -complete=custom,VeonimCmdCompletions Veonim call Veonim(<f-args>)`,
  '--embed'
], { cwd: homedir() })

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

  if (errors.length) notifyUI(errors.join('\n'), NotifyKind.Error)

  api.command(`let g:vn_loaded = 1`)
  api.command(`set laststatus=2`)
  api.command(`set statusline=%{VeonimStatusline()}`)
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
