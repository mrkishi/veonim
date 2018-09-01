import { expr, call, g, getCurrent, getCurrentPosition, notifyEvent } from '../core/neovim'
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

  Object.assign(vimState, nextState)

  notifyEvent(vimEvent)
}

// TODO: state refresher should not send events. make these two separate calls pls kthx
onSwitchVim(stateRefresher('bufLoad'))
