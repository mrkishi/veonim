import { expr, call, g, getCurrent, getCurrentPosition, notifyEvent, autocmd } from '../core/neovim'
import { BufferOption, VimEvent } from '../neovim/types'
import { onSwitchVim } from '../core/sessions'
import vimState from '../neovim/state'
import { join } from 'path'

export const stateRefresher = (vimEvent: keyof VimEvent) => async () => {
  const [ filetype, cwd, file, colorscheme, revision, { line, column }, buffer ] = await Promise.all([
    expr(`&filetype`),
    call.getcwd(),
    call.expand(`%f`),
    g.colors_name,
    expr(`b:changedtick`),
    getCurrentPosition(),
    getCurrent.buffer,
  ])

  const bufferType = await buffer.getOption(BufferOption.Type)

  Object.assign(vimState, {
    cwd,
    file,
    line,
    column,
    filetype,
    revision,
    bufferType,
    colorscheme,
    absoluteFilepath: join(cwd, file),
  })

  notifyEvent(vimEvent)
}

onSwitchVim(stateRefresher('bufLoad'))
autocmd.bufAdd(stateRefresher('bufAdd'))
autocmd.bufEnter(stateRefresher('bufLoad'))
autocmd.bufDelete(stateRefresher('bufUnload'))
autocmd.dirChanged(`v:event.cwd`, m => vimState.cwd = m)
autocmd.fileType(`expand('<amatch>')`, m => vimState.filetype = m)
autocmd.colorScheme(`expand('<amatch>')`, m => vimState.colorscheme = m)
autocmd.insertEnter(() => notifyEvent('insertEnter'))
autocmd.insertLeave(() => notifyEvent('insertLeave'))
