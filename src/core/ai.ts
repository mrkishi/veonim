import { on, onStateChange, getCurrent as vim } from '../core/neovim'
import { getSignatureHint } from '../ai/signature-hint'
import * as updateService from '../ai/update-server'
import { getCompletions } from '../ai/completions'
import { colorizer } from '../ai/hover'
import '../ai/diagnostics'
import '../ai/references'
import '../ai/definition'
import '../ai/symbols'
import '../ai/rename'

onStateChange.colorscheme((color: string) => colorizer.call.setColorScheme(color))

on.bufLoad(() => updateService.update())
on.bufChange(() => updateService.update())

// using cursor move with a diff on revision number because we might need to
// update the lang server before triggering completions/hint lookups. using
// textChangedI + cursorMovedI would make it very difficult to wait in cursorMovedI
// until textChangedI ran AND updated the server
on.cursorMoveInsert(async (bufferModified, { line, column }) => {
  if (bufferModified) await updateService.update({ lineChange: true })
  const lineContent = await vim.lineContent
  getCompletions(lineContent, line, column)
  getSignatureHint(lineContent)
})
