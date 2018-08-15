import { references as getReferences, Reference } from '../langserv/adapter'
import { action, current as vimState, jumpTo } from '../core/neovim'
import { findNext, findPrevious } from '../support/relative-finder'
import { show } from '../components/references'

const groupResults = (m: Reference[]) => [...m.reduce((map, ref: Reference) => {
  map.has(ref.path)
    ? map.get(ref.path)!.push(ref)
    : map.set(ref.path, [ ref ])

  return map
}, new Map<string, Reference[]>())]

action('references', async () => {
  const { keyword, references } = await getReferences(vimState)
  if (!references.length) return

  const referencesForUI = groupResults(references)
  show(referencesForUI, keyword)
})

action('next-usage', async () => {
  const { references } = await getReferences(vimState)
  if (!references.length) return

  const { line, column, absoluteFilepath } = vimState
  const reference = findNext<Reference>(references, absoluteFilepath, line, column)
  if (reference) jumpTo(reference)
})

action('prev-usage', async () => {
  const { references } = await getReferences(vimState)
  if (!references.length) return

  const { line, column, absoluteFilepath } = vimState
  const reference = findPrevious<Reference>(references, absoluteFilepath, line, column)
  if (reference) jumpTo(reference)
})
