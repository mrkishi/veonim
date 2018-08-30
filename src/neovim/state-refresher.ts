import { expr, call, g, getCurrent, getCurrentPosition, notifyEvent } from '../core/neovim'
import { BufferOption, VimEvent } from '../neovim/types'
import vimState from '../neovim/state'
import { join } from 'path'

export default (vimEvent: keyof VimEvent) => async () => {
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
