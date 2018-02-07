import { action, current as vimState, cmd, feedkeys } from '../core/neovim'
import { findNext, findPrevious } from '../support/relative-finder'
import { SearchResult, show }from '../components/references'
import { VimQFItem, references } from '../langserv/adapter'
import { pathRelativeToCwd } from '../support/utils'
import { join } from 'path'

interface Reference {
  path: string,
  text: string,
  line: number,
  col: number,
}

const groupResults = (m: Reference[]) => [...m.reduce((map, { path, text, line, col }: Reference) => {
  if (!map.has(path)) return (map.set(path, [{ text, line, col }]), map)
  return (map.get(path)!.push({ text, line, col }), map)
}, new Map<string, SearchResult[]>())]

const asReference = (m: VimQFItem): Reference => ({
  text: m.desc,
  line: m.line,
  col: m.column,
  path: pathRelativeToCwd(join(m.cwd, m.file), vimState.cwd),
})

// TODO: this needs to find across multiple files
// and cycle around

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
  const reference = findNext<Reference>(adjustedRefs, currentPath, line, column)
  if (!reference) return

  cmd(`e ${reference.path}`)
  feedkeys(`${reference.line}G${reference.col}|`)
})

action('prev-usage', async () => {
  const refs = await references(vimState)
  if (!refs) return

  const { line, column, cwd, file } = vimState
  const currentPath = join(cwd, file)
  const adjustedRefs = refs.map(asReference)
  const reference = findPrevious<Reference>(adjustedRefs, currentPath, line, column)
  if (!reference) return

  cmd(`e ${reference.path}`)
  feedkeys(`${reference.line}G${reference.col}|`)
})

// TODO: action for highlighting usages? or implicit on (next|prev)-usage?
