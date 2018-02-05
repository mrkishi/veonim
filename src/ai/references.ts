import { action, current as vimState } from '../core/neovim'
import { SearchResult, show }from '../components/references'
import { VimQFItem, references } from '../langserv/adapter'

const groupResults = (m: VimQFItem[]) => [...m.reduce((map, { file, desc: text, line, column: col }: VimQFItem) => {
  if (!map.has(file)) return (map.set(file, [{ text, line, col }]), map)
  return (map.get(file)!.push({ text, line, col }), map)
}, new Map<string, SearchResult[]>())]

action('references', async () => {
  const refs = await references(vimState)
  console.log(refs)
  const items = groupResults(refs)
  console.log(items)
  show(items)
})
