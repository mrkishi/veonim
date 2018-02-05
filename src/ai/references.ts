import { action, current as vimState, cmd, feedkeys } from '../core/neovim'
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

interface Distance {
  reference: Reference,
  lines: number,
  characters: number,
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

const distanceAsc = (a: Distance, b: Distance) =>
  a.lines === b.lines ? a.characters < b.characters : a.lines < b.lines

const distanceDesc = (a: Distance, b: Distance) =>
  a.lines === b.lines ? a.characters > b.characters : a.lines > b.lines

// TODO: this needs to find across multiple files
const findClosestReference = (references: Reference[], line: number, column: number, findNext: boolean) => {
  const distances = references.map(r => ({
    reference: r,
    lines: r.line - line,
    characters: r.col - column,
  } as Distance))

  const sortedReferences = distances.sort((a, b) => findNext
    ? distanceDesc(a, b) ? 1 : 0
    : distanceAsc(a, b) ? 1 : 0)

  const validReferences = findNext
    ? sortedReferences.filter(m => m.lines === 0 ? m.characters > 0 : m.lines > 0)
    : sortedReferences.filter(m => m.lines === 0 ? m.characters < 0 : m.lines < 0)

  return (validReferences[0] || {}).reference
}

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

  const { line, column } = vimState
  const adjustedRefs = refs.map(asReference)
  const reference = findClosestReference(adjustedRefs, line, column, true)
  if (!reference) return

  cmd(`e ${reference.path}`)
  feedkeys(`${reference.line}G${reference.col}|`)
})

action('prev-usage', async () => {
  const refs = await references(vimState)
  if (!refs) return

  const { line, column } = vimState
  const adjustedRefs = refs.map(asReference)
  const reference = findClosestReference(adjustedRefs, line, column, false)
  if (!reference) return

  cmd(`e ${reference.path}`)
  feedkeys(`${reference.line}G${reference.col}|`)
})

// TODO: action for highlighting usages? or implicit on (next|prev)-usage?
