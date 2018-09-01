import { asColor, ID, log, onFnCall, merge, prefixWith } from '../support/utils'
import { NotifyKind, notify as notifyUI } from '../ui/notifications'
import { startupFuncs, startupCmds } from '../core/vim-startup'
import NeovimUtils, { CmdGroup } from '../support/neovim-utils'
import CreateTransport from '../messaging/transport'
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

  // usually vimrc parsing errors
  if (errors.length) notifyUI(errors.join('\n'), NotifyKind.Error)

  // we are going to override any of these user settings, because the user is
  // WRONG.  TODO: jk, the problem is we are hacking our own window grids, and
  // the cmd/msgline/lastrow is not hidden from the render output. these
  // settings fix some of those issues.  however once we get official support
  // for external windows from nvim, we should not need these
  //
  // laststatus=0 ---> disable statusline
  // nocursorline ---> we render our own cursorline based on cursor position. this is a bit
  //                  hacky. i think we will get official support soonish™
  // shortmess+=Ic --> disable completion "item 1 of 3" messages in message/cmdline/lastrow
  // noshowmode -----> no "--INSERT--" bullshit in lastrow
  // noshowcmd ------> disable the visual keybinds in lastrow, like "ciw" displays "c" in botright
  // noruler --------> no "42,13" line,column display in lastrow
  //
  // if we cleanup any commands from here in the future, remember to clean them
  // up also from 'startupCmds' (if applicable)
  const postStartupCommands = CmdGroup`
    let g:vn_loaded = 1
    set laststatus=0
    set nocursorline
    set shortmess+=Ic
    set noshowmode
    set noshowcmd
    set noruler
  `

  api.command(postStartupCommands)

  // used when we create a new vim session with a predefined cwd
  dir && api.command(`cd ${dir}`)

  // v:servername used to connect other clients to nvim via TCP
  //
  // by default we use the nvim process stdout/stdin to do core operations.
  // things like rendering, key input, etc. these are high priority items and
  // will live on the main thread.
  //
  // now, we will have a lot of async operations like reading buffers,
  // modifying buffer text contents, setting highlight content, etc. that could
  // potentially be slow to serialize/deserialize on the main thread (because
  // msgpack is SLOW as a sloth). so we will move these non-essential operations
  // to web workers.
  //
  // we will also need access to the nvim apis in the extension-host web worker
  // (or process in the future?). extensions will talk to a vscode-to-nvim api
  // bridge. there is no good reason why we should bridge the nvim api over
  // web worker postMessages - just have the web worker talk directly to nvim
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
