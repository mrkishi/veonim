import { action, current as vim, getCurrent, cmd, onStateChange } from '../core/neovim'
import { highlights, references as getReferences } from '../langserv/adapter'
import { Highlight, HighlightGroupId } from '../neovim/types'
import { supports } from '../langserv/server-features'
import { brighten } from '../ui/css'

const setHighlightColor = () => {
  const highlightColor = brighten(vim.bg, 25)
  cmd(`highlight ${Highlight.DocumentHighlight} guibg=${highlightColor}`)
}

onStateChange.colorscheme(setHighlightColor)
setHighlightColor()

action('highlight', async () => {
  const referencesSupported = supports.references(vim.cwd, vim.filetype)
  const highlightsSupported = supports.highlights(vim.cwd, vim.filetype)
  const anySupport = highlightsSupported || referencesSupported

  if (!anySupport) return

  const { references } = highlightsSupported
    ? await highlights(vim)
    : await getReferences(vim)

  const buffer = await getCurrent.buffer
  buffer.clearHighlight(HighlightGroupId.DocumentHighlight, 0, -1)

  if (!references.length) return

  references.forEach(hi => buffer.addHighlight(
    HighlightGroupId.DocumentHighlight,
    Highlight.DocumentHighlight,
    hi.line,
    hi.column,
    hi.endColumn,
  ))
})

action('highlight-clear', async () => {
  (await getCurrent.buffer).clearHighlight(HighlightGroupId.DocumentHighlight, 0, -1)
})
