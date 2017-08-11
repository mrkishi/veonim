import { ID, log, onFnCall, merge } from './utils'
import configReader, { ConfigCallback } from './config-reader'
import { encoder, decoder } from './transport'
import { ChildProcess } from 'child_process'
import Neovim from '@veonim/neovim'
import { homedir } from 'os'
import { Api } from './api'
import setupRPC from './rpc'

interface VimInstance { id: number, proc: ChildProcess, attached: boolean, socket?: string}
export interface NewVimResponse { id: number, socket: string }
type RedrawFn = (m: any[]) => void
type ExitFn = (id: number, code: number) => void

const $HOME = homedir()
const vimOptions = { rgb: true, ext_popupmenu: true, ext_tabline: true, ext_wildmenu: false, ext_cmdline: false }
const ids = { vim: ID(), activeVim: -1 }
const clientSize = { width: 0, height: 0 }
const vimInstances = new Map<number, VimInstance>()

let onExitFn: ExitFn = function () {}

const spawnVimInstance = ({ askCd = false }) => Neovim([
  '--cmd',
  `let g:veonim=1`,
  '--cmd',
  `let g:vn_loaded=0`,
  '--cmd',
  `let g:vn_ask_cd=${<any>askCd | 0}`,
  '--cmd',
  `exe ":fun! Veonim(event, ...)\\n call rpcnotify(0, 'veonim', a:event, a:000) \\n endfun"`,
  '--cmd',
  `com! -nargs=+ Veonim if g:vn_loaded | call Veonim(<f-args>) | else | call timer_start(1, {-> Veonim(<f-args>)}) | endif`,
  '--embed',
], {
  cwd: $HOME,
  //env: Object.assign({}, process.env, {
    //NVIM_LISTEN_ADDRESS: '127.0.0.1:9890 nvim'
  //})
})

const createNewVimInstance = ({ askCd = false } = {}): number => {
  const proc = spawnVimInstance({ askCd })
  const id = ids.vim.next()

  vimInstances.set(id, { id, proc, attached: false })

  proc.on('error', e => log `vim ${id} err ${e}`)
  proc.stdout.on('error', e => log `vim ${id} stdout err ${(JSON.stringify(e))}`)
  proc.stdin.on('error', e => log `vim ${id} stdin err ${(JSON.stringify(e))}`)
  proc.on('exit', c => onExitFn(id, c))

  return id
}

export const switchToVim = (id: number) => {
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

  // TODO: problem if subscribe called multiple times for same event?
  // TODO: move this to userland... onVimCreate...
  // TODO: wait do we have to re-register all events on every reattach?!?!
  //;[...watchers.keys()].forEach(event => api.subscribe(event))
}

export const newVim = async ({ askCd = false } = {}): Promise<NewVimResponse> => {
  const id = createNewVimInstance({ askCd })
  switchToVim(id)
  api.command(`let g:vn_loaded=1`)
  const socket = await req.eval('v:servername')
  vimInstances.get(id)!.socket = socket
  return { id, socket }
}

export const attachToVim = (id: number) => {
  if (!vimInstances.has(id)) return
  const vim = vimInstances.get(id)!
  if (vim.attached) return
  api.uiAttach(clientSize.width, clientSize.height, vimOptions)
  vim.attached = true
}

const { notify, request, on: onEvent, handleRequest, onData } = setupRPC(m => encoder.write(m))
decoder.on('data', onData)

export const req: Api = onFnCall((name: string, args: any[] = []) => request(name, args))
export const api: Api = onFnCall((name: string, args: any[]) => notify(name, args))
export const on = (event: string, fn: (data: any) => void) => onEvent(event, fn)
export const onRequest = (event: string, fn: Function) => handleRequest(event, fn)
export const onExit = (fn: ExitFn) => { onExitFn = fn }
export const onRedraw = (fn: RedrawFn) => onEvent('redraw', fn)
export const onConfig = (fn: ConfigCallback) => configReader('nvim/init.vim', fn, log)

export const resize = (width: number, height: number) => {
  merge(clientSize, { width, height })
  if (ids.activeVim > -1) api.uiTryResize(width, height)
}

export const subscribe = (event: string, fn: (data: any) => void) => {
  onEvent(event, fn)
  if (ids.activeVim > -1) api.subscribe(event)
}
