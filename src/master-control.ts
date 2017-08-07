import { ID, log, Watchers, onFnCall, snakeCase, merge } from './utils'
import configReader, { ConfigCallback } from './config-reader'
import { ChildProcess } from 'child_process'
import { encoder, decoder } from './transport'
import Neovim from '@veonim/neovim'
import { homedir } from 'os'
import { Api } from './api'

interface VimInstance { id: number, proc: ChildProcess, attached: boolean }
type RedrawFn = (m: any[]) => void
type ExitFn = (id: number, code: number) => void

const $HOME = homedir()
const asVimFn = (m: string) => `nvim_${snakeCase(m)}`
const vimOptions = { rgb: true, ext_popupmenu: true, ext_tabline: false, ext_wildmenu: false, ext_cmdline: false }
const ids = { vim: ID(), req: ID(), activeVim: -1 }
const clientSize = { width: 0, height: 0 }

let onRedrawFn: RedrawFn = function () {}
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
  env: Object.assign({}, process.env, {
    NVIM_LISTEN_ADDRESS: '127.0.0.1:9890 nvim'
  })
})

const vimInstances = new Map<number, VimInstance>()

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
  ;[...watchers.keys()].forEach(event => api.subscribe(event))
}

export const newVim = ({ askCd = false } = {}): number => {
  const id = createNewVimInstance({ askCd })
  switchToVim(id)
  api.command(`let g:vn_loaded=1`)
  return id
}

export const attachToVim = (id: number) => {
  if (!vimInstances.has(id)) return
  const vim = vimInstances.get(id)!
  if (vim.attached) return
  api.uiAttach(clientSize.width, clientSize.height, vimOptions)
  vim.attached = true
}

const watchers = new Watchers()
const pendingRequests = new Map()
const requestHandlers = new Map<string, Function>()
const send = (m: any[]) => encoder.write(m)
const notify = (name: string, args: any[]) => send([2, name, args])
const request = (name: string, args: any[]) => {
  const reqId = ids.req.next()
  send([0, reqId, name, args])
  return new Promise((done, fail) => pendingRequests.set(reqId, { done, fail }))
}

const noRequestMethodFound = (id: number) => send([1, id, 'no one was listening for your request, sorry', null])

const onVimRequest = (id: number, method: string, args: any[]) => {
  const reqHandler = requestHandlers.get(method)
  if (!reqHandler) return noRequestMethodFound(id)

  const maybePromise = reqHandler(...args as any[])

  if (maybePromise && maybePromise.then) maybePromise
    .then((result: any) => send([1, id, null, result]))
    .catch((err: string) => send([1, id, err, null]))
}

const onResponse = (id: number, error: string, result: any) => {
  if (!pendingRequests.has(id)) return

  const { done, fail } = pendingRequests.get(id)
  error ? fail(error) : done(result)
  pendingRequests.delete(id)
}

const onNotification = (method: string, args: any[]) => method === 'redraw'
  ? onRedrawFn(args)
  : watchers.notify(method, args)

decoder.on('data', ([ type, ...d ]: [ number, string | Buffer | any[] ]) => {
  if (type === 0) onVimRequest(d[0] as number, d[1].toString(), d[2] as any[])
  else if (type === 1) onResponse(d[0] as number, d[1] as string, d[2])
  else if (type === 2) onNotification(d[0].toString(), d[1] as any[])
})

export const req: Api = onFnCall((name: string, args: any[] = []) => request(asVimFn(name), args))
export const api: Api = onFnCall((name: string, args: any[]) => notify(asVimFn(name), args))
export const on = (event: string, fn: (data: any) => void) => watchers.add(event, fn)
export const onRequest = (event: string, fn: Function) => requestHandlers.set(event, fn)
export const onExit = (fn: ExitFn) => { onExitFn = fn }
export const onRedraw = (fn: RedrawFn) => { onRedrawFn = fn }
export const onConfig = (fn: ConfigCallback) => configReader('nvim/init.vim', fn, log)

export const resize = (width: number, height: number) => {
  merge(clientSize, { width, height })
  if (ids.activeVim > -1) api.uiTryResize(width, height)
}

export const subscribe = (event: string, fn: (data: any) => void) => {
  watchers.add(event, fn)
  if (ids.activeVim > -1) api.subscribe(event)
}
