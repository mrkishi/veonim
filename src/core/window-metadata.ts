import { getCurrent, BufferOption } from '../core/neovim'

export interface WindowMetadata {
  id: number
  active: boolean
  filetype: BufferOption.Filetype
  name: string
  modified: await buffer.getOption(BufferOption.Modified)
  terminal: (await buffer.getOption(BufferOption.Type)) === BufferType.Terminal
  termAttached: await buffer.getVar(BufferVar.TermAttached).catch(() => false)
  termFormat: await buffer.getVar(BufferVar.TermFormat).catch(() => '')
}

export default async () => {
  const activeWindow = (await getCurrent.window).id
  const wins = await (await getCurrent.tab).windows

  return await Promise.all(wins.map(async w => {
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
