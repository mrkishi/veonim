import { action, current as vimState, jumpTo } from '../core/neovim'
import { findNext, findPrevious } from '../support/relative-finder'
import { SearchResult, show } from '../components/references'
import { VimQFItem, references } from '../langserv/adapter'
import { join } from 'path'

interface Reference {
  path: string,
  text: string,
  line: number,
  column: number,
  endLine: number,
  endColumn: number,
}

const groupResults = (m: Reference[]) => [...m.reduce((map, { path, text, line, column }: Reference) => {
  if (!map.has(path)) return (map.set(path, [{ text, line, column }]), map)
  return (map.get(path)!.push({ text, line, column }), map)
}, new Map<string, SearchResult[]>())]

const asReference = (m: VimQFItem): Reference => ({
  text: m.desc,
  line: m.line,
  column: m.column - 1,
  endLine: m.endLine,
  endColumn: m.endColumn - 1,
  path: join(m.cwd, m.file),
})

action('references', async () => {
  const refs = await references(vimState)
  const referencedSymbol = refs[0].keyword
  const adjustedRefs = refs.map(asReference)
  const items = groupResults(adjustedRefs)
  show(items, referencedSymbol)
})

action('next-usage', async () => {
  const refs = await references(vimState)
  if (!refs) return

  const { line, column, cwd, file } = vimState
  const currentPath = join(cwd, file)
  const adjustedRefs = refs.map(asReference)
  const reference = findNext<Reference>(adjustedRefs, currentPath, line, column - 1)
  if (!reference) return

  jumpTo(reference)
})

action('prev-usage', async () => {
  const refs = await references(vimState)
  if (!refs) return

  const { line, column, cwd, file } = vimState
  const currentPath = join(cwd, file)
  const adjustedRefs = refs.map(asReference)
  const reference = findPrevious<Reference>(adjustedRefs, currentPath, line, column - 1)
  if (!reference) return

  jumpTo(reference)
})
