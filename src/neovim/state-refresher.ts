import { expr, call, g, getCurrent, getCurrentPosition, notifyEvent, autocmd } from '../core/neovim'
import { BufferOption, VimEvent } from '../neovim/types'
import { onSwitchVim } from '../core/sessions'
import vimState from '../neovim/state'
import { join } from 'path'

export const stateRefresher = (vimEvent: keyof VimEvent) => async () => {
  const [ filetype, cwd, file, colorscheme, revision, { line, column }, buffer, editorTopLine, editorBottomLine ] = await Promise.all([
    expr(`&filetype`),
    call.getcwd(),
    call.expand(`%f`),
    g.colors_name,
    expr(`b:changedtick`),
    getCurrentPosition(),
    getCurrent.buffer,
    expr(`line('w0')`),
    expr(`line('w$')`),
  ])

  const bufferType = await buffer.getOption(BufferOption.Type)

  const nextState = {
    cwd,
    file,
    line,
    column,
    filetype,
    revision,
    bufferType,
    colorscheme,
    editorTopLine,
    editorBottomLine,
    absoluteFilepath: join(cwd, file),
  }

  const [ state, position ] = await Promise.all([
    call.VeonimState(),
    call.VeonimPosition(),
  ])

  const betterState = {
    ...state,
    ...position,
    absoluteFilepath: join(state.cwd, state.file),
  }

  // console.log('betterState', betterState)
  // console.log('nextState', nextState)

  Object.assign(vimState, nextState)

  notifyEvent(vimEvent)
}

// TODO: this does not currently work on first call (module load & parse)
setImmediate(() => {
  onSwitchVim(stateRefresher('bufLoad'))
  autocmd.bufAdd(stateRefresher('bufAdd'))
  autocmd.bufEnter(stateRefresher('bufLoad'))
  autocmd.bufDelete(stateRefresher('bufUnload'))
  autocmd.dirChanged(`v:event.cwd`, m => vimState.cwd = m)
  autocmd.fileType(`expand('<amatch>')`, m => vimState.filetype = m)
  autocmd.colorScheme(`expand('<amatch>')`, m => vimState.colorscheme = m)
  // TODO: deprecate this and use vim mode
  autocmd.insertEnter(() => notifyEvent('insertEnter'))
  autocmd.insertLeave(() => notifyEvent('insertLeave'))
})
