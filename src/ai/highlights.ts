import { action, current as vim, getCurrent, cmd, onStateChange, HighlightGroupId, Highlight } from '../core/neovim'
import { highlights, references as getReferences } from '../langserv/adapter'
import { canCall } from '../langserv/director'
import { brighten } from '../ui/css'

const setHighlightColor = () => {
  const highlightColor = brighten(vim.bg, 25)
  cmd(`highlight ${Highlight.DocumentHighlight} guibg=${highlightColor}`)
}

onStateChange.colorscheme(setHighlightColor)
setHighlightColor()

action('highlight', async () => {
  const highlightFeatureEnabled = canCall(vim.cwd, vim.filetype, 'documentHighlight')
  const { references } = highlightFeatureEnabled
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
