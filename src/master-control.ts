import { ID, log, onFnCall, merge, prefixWith } from './utils'
import { ChildProcess } from 'child_process'
import CreateTransport from './transport'
import { Api, Prefixes } from './api'
import Neovim from '@veonim/neovim'
import { homedir } from 'os'
import SetupRPC from './rpc'

interface VimInstance { id: number, proc: ChildProcess, attached: boolean, path?: string}
export interface NewVimResponse { id: number, path: string }
type RedrawFn = (m: any[]) => void
type ExitFn = (id: number, code: number) => void

const prefix = { core: prefixWith(Prefixes.Core) }
const { encoder, decoder } = CreateTransport()
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
], { cwd: $HOME })

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
  const id = createNewVimInstance({ askCd })
  switchTo(id)
  api.command(`let g:vn_loaded=1`)
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

const req: Api = onFnCall((name: string, args: any[] = []) => request(prefix.core(name), args))
const api: Api = onFnCall((name: string, args: any[]) => notify(prefix.core(name), args))

export const onExit = (fn: ExitFn) => { onExitFn = fn }
export const onRedraw = (fn: RedrawFn) => onEvent('redraw', fn)
export const input = (keys: string) => api.input(keys)

export const resize = (width: number, height: number) => {
  merge(clientSize, { width, height })
  if (ids.activeVim > -1) api.uiTryResize(width, height)
}

export const getColor = async (id: number) => {
  const [ fg = 0, bg = 0 ] = await Promise.all([
    req.callFunction('synIDattr', [ id, 'fg#' ]),
    req.callFunction('synIDattr', [ id, 'bg#' ]),
  ]).catch(e => e)

  return { fg, bg }
}
