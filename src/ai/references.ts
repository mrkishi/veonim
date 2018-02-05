import { action, current as vimState } from '../core/neovim'
import { SearchResult, show }from '../components/references'
import { VimQFItem, references } from '../langserv/adapter'
import { pathRelativeToCwd } from '../support/utils'
import { join } from 'path'

interface Result {
  path: string,
  text: string,
  line: number,
  col: number,
}

const groupResults = (m: Result[]) => [...m.reduce((map, { path, text, line, col }: Result) => {
  if (!map.has(path)) return (map.set(path, [{ text, line, col }]), map)
  return (map.get(path)!.push({ text, line, col }), map)
}, new Map<string, SearchResult[]>())]

const asResult = (m: VimQFItem): Result => ({
  text: m.desc,
  line: m.line,
  col: m.column,
  path: pathRelativeToCwd(join(m.cwd, m.file), vimState.cwd),
})

action('references', async () => {
  const refs = await references(vimState)
  const referencedSymbol = refs[0].keyword
  const adjustedRefs = refs.map(asResult)
  const items = groupResults(adjustedRefs)
  show(items, referencedSymbol)
})
