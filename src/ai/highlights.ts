import { action, current as vim, getCurrent, cmd, onStateChange } from '../core/neovim'
import { highlights, references, VimQFItem } from '../langserv/adapter'
import { canCall } from '../langserv/director'
import { brighten } from '../ui/css'

// has no meaning - just need a random id that represents document highlights
const HL_ID = 900422
const HL_GROUP = 'VeonimDocumentHighlight'

const setHighlightColor = () => {
  const highlightColor = brighten(vim.bg, 25)
  cmd(`highlight ${HL_GROUP} guibg=${highlightColor}`)
}

onStateChange.colorscheme(() => setHighlightColor())
setHighlightColor()

// TODO: should really normalize positions...
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
  buffer.clearHighlight(HL_ID, 1, -1)

  if (!positions.length) return

  positions
    .map(asHighlight)
    .forEach(hi => buffer.addHighlight(HL_ID, HL_GROUP, hi.line, hi.start, hi.end))
})

action('highlight-clear', async () => {
  (await getCurrent.buffer).clearHighlight(HL_ID, 1, -1)
})
