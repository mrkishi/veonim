import { action, current as vim, getCurrent, cmd, onStateChange, HighlightGroupId, Highlight } from '../core/neovim'
import { highlights, references, VimQFItem } from '../langserv/adapter'
import { canCall } from '../langserv/director'
import { brighten } from '../ui/css'

const setHighlightColor = () => {
  const highlightColor = brighten(vim.bg, 25)
  cmd(`highlight ${Highlight.DocumentHighlight} guibg=${highlightColor}`)
}

onStateChange.colorscheme(setHighlightColor)
setHighlightColor()

// should really normalize positions...
const asHighlight = (m: VimQFItem) => ({
  line: m.line - 1,
  start: m.column - 1,
  end: m.endColumn - 1,
})

action('highlight', async () => {
  const highlightFeatureEnabled = canCall(vim.cwd, vim.filetype, 'documentHighlight')
  const positions = highlightFeatureEnabled
    ? await highlights(vim)
    : await references(vim)

  const buffer = await getCurrent.buffer
  buffer.clearHighlight(HighlightGroupId.DocumentHighlight, 1, -1)

  if (!positions.length) return

  positions
    .map(asHighlight)
    .forEach(hi => buffer.addHighlight(
      HighlightGroupId.DocumentHighlight,
      Highlight.DocumentHighlight,
      hi.line,
      hi.start,
      hi.end,
    ))
})

action('highlight-clear', async () => {
  (await getCurrent.buffer).clearHighlight(HighlightGroupId.DocumentHighlight, 1, -1)
})
