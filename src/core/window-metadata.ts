import { current, BufferOption, BufferType } from '../core/neovim'
import { simplifyPath, pathReducer } from '../support/utils'
import { BufferVar } from '../core/vim-functions'

export interface WindowMetadata {
  id: number
  dir: string
  name: string
  filetype: string
  active: boolean
  modified: boolean
  terminal: boolean
  termAttached: boolean
  termFormat: string
}

const improvedWindowTitle = (name: string, uniqNames: Set<string>, terminal: boolean) => {
  if (terminal || !name) return { name }

  const uniqueNames = [...uniqNames].filter(m => m !== name)
  const uniqueNameReducers = uniqueNames.map(m => pathReducer(m))
  const nameReducer = pathReducer(name)

  const file = nameReducer.reduce()
  const uniqueFileNames = new Set(uniqueNameReducers.map(m => m.reduce()))

  // TODO: go n-levels deeper
  return { name: file, dir: uniqueFileNames.has(file) ? nameReducer.reduce() : undefined }
}

const betterTitles = (windows: any[]): WindowMetadata[] => {
  const uniqNames = new Set(windows.map(w => w.name))
  return windows.map(w => ({ ...w, ...improvedWindowTitle(w.name, uniqNames, w.terminal) }))
}

export default async (): Promise<WindowMetadata[]> => {
  const activeWindow = await current.window.id
  const wins = await current.tabpage.windows

  const windowsWithApiData = await Promise.all(wins.map(async w => {
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

  return betterTitles(windowsWithApiData)
}
