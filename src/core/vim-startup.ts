import { CmdGroup, FunctionGroup } from '../support/neovim-utils'
import { colorscheme } from '../config/default-configs'
import { resolve } from 'path'

const runtimeDir = resolve(__dirname, '..', 'runtime')
const startup = FunctionGroup()

export const startupFuncs = () => startup.getFunctionsAsString()

export const startupCmds = CmdGroup`
  let $PATH .= ':${runtimeDir}/${process.platform}'
  let &runtimepath .= ',${runtimeDir}'
  let g:veonim = 1
  let g:vn_loaded = 0
  let g:vn_cmd_completions = ''
  let g:vn_rpc_buf = []
  let g:vn_events = {}
  let g:vn_callbacks = {}
  let g:vn_callback_id = 0
  let g:vn_jobs_connected = {}
  colorscheme ${colorscheme}
  set guicursor=n:block-CursorNormal,i:hor10-CursorInsert,v:block-CursorVisual
  set background=dark
  set laststatus=0
  set shortmess+=Ic
  set noshowcmd
  set noshowmode
  set noruler
  set nocursorline
  call serverstart()
`

startup.defineFunc.VeonimComplete`
  return a:1 ? g:veonim_complete_pos : g:veonim_completions
`

startup.defineFunc.VeonimCompleteScroll`
  if len(g:veonim_completions)
    if g:veonim_completing
      return a:1 ? "\\<c-n>" : "\\<c-p>"
    endif

    let g:veonim_completing = 1
    return a:1 ? "\\<c-x>\\<c-u>" : "\\<c-x>\\<c-u>\\<c-p>\\<c-p>"
  endif

  return a:1 ? "\\<tab>" : "\\<c-w>"
`

startup.defineFunc.VeonimSendState`
  call rpcnotify(0, 'veonim-state', VeonimState())
`

startup.defineFunc.VeonimSendPosition`
  call rpcnotify(0, 'veonim-position', VeonimPosition())
`

startup.defineFunc.VeonimState`
  let currentBuffer = bufname('%')
  let filetype = getbufvar(currentBuffer, '&filetype')
  let cwd = getcwd()
  let file = expand('%f')
  let colorscheme = g:colors_name
  let buftype = getbufvar(currentBuffer, '&buftype')
  let p = getcurpos()
  let topLine = line('w0')
  let bottomLine = line('w$')
  return {'filetype':filetype, 'cwd':cwd, 'file':file, 'colorscheme':colorscheme, 'revision':b:changedtick, 'bufferType':buftype, 'line':p[1]-1, 'column':p[2]-1, 'editorTopLine':topLine, 'editorBottomLine':bottomLine}
`

startup.defineFunc.VeonimPosition`
  let p = getcurpos()
  let topLine = line('w0')
  let bottomLine = line('w$')
  return {'line':p[1]-1, 'column':p[2]-1, 'editorTopLine':topLine, 'editorBottomLine':bottomLine}
`

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
