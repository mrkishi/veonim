import { references as getReferences, Reference } from '../langserv/adapter'
import { findNext, findPrevious } from '../support/relative-finder'
import { supports } from '../langserv/server-features'
import { action, jumpTo } from '../core/neovim'
import { show } from '../components/references'
import vim from '../neovim/state'

const groupResults = (m: Reference[]) => [...m.reduce((map, ref: Reference) => {
  map.has(ref.path)
    ? map.get(ref.path)!.push(ref)
    : map.set(ref.path, [ ref ])

  return map
}, new Map<string, Reference[]>())]

action('references', async () => {
  if (!supports.references(vim.cwd, vim.filetype)) return

  const { keyword, references } = await getReferences(vim)
  if (!references.length) return

  const referencesForUI = groupResults(references)
  show(referencesForUI, keyword)
})

action('next-usage', async () => {
  if (!supports.references(vim.cwd, vim.filetype)) return

  const { references } = await getReferences(vim)
  if (!references.length) return

  const { line, column, absoluteFilepath } = vim
  const reference = findNext<Reference>(references, absoluteFilepath, line, column)
  if (reference) jumpTo(reference)
})

action('prev-usage', async () => {
  if (!supports.references(vim.cwd, vim.filetype)) return

  const { references } = await getReferences(vim)
  if (!references.length) return

  const { line, column, absoluteFilepath } = vim
  const reference = findPrevious<Reference>(references, absoluteFilepath, line, column)
  if (reference) jumpTo(reference)
})
