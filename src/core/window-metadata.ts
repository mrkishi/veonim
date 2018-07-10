import { current, getCurrent, BufferOption, BufferType } from '../core/neovim'
import { BufferVar } from '../core/vim-functions'
import { simplifyPath } from '../support/utils'

export interface WindowMetadata {
  id: number
  name: string
  filetype: string
  active: boolean
  modified: boolean
  terminal: boolean
  termAttached: boolean
  termFormat: string
}

export default async (): Promise<WindowMetadata[]> => {
  // TODO: fix neovim.current to handle fuctions AND properties, then use that here
  const activeWindow = (await getCurrent.window).id
  const wins = await (await getCurrent.tab).windows

  return Promise.all(wins.map(async w => {
    const buffer = await w.buffer

    return {
      id: w.id,
      active: w.id === activeWindow,
      filetype: await buffer.getOption(BufferOption.Filetype),
      name: (simplifyPath(await buffer.name, current.cwd) || '').replace(/^term:\/\/\.\/\/\w+:/, ''),
      modified: await buffer.getOption(BufferOption.Modified),
      terminal: (await buffer.getOption(BufferOption.Type)) === BufferType.Terminal,
      termAttached: await buffer.getVar(BufferVar.TermAttached).catch(() => false),
      termFormat: await buffer.getVar(BufferVar.TermFormat).catch(() => ''),
    }
  }))
}
