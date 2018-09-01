import { getSignatureHint } from '../ai/signature-hint'
import * as updateService from '../ai/update-server'
import { on, getCurrentLine } from '../core/neovim'
import { getCompletions } from '../ai/completions'
import colorizer from '../services/colorizer'
import { watch } from '../neovim/state'
import '../ai/diagnostics'
import '../ai/references'
import '../ai/definition'
import '../ai/highlights'
import '../ai/symbols'
import '../ai/rename'
import '../ai/hover'

watch.colorscheme((color: string) => colorizer.call.setColorScheme(color))

on.bufAdd(() => updateService.update({ bufferOpened: true }))
on.bufLoad(() => updateService.update())
on.bufChange(() => updateService.update())

// using cursor move with a diff on revision number because we might need to
// update the lang server before triggering completions/hint lookups. using
// textChangedI + cursorMovedI would make it very difficult to wait in cursorMovedI
// until textChangedI ran AND updated the server
on.cursorMoveInsert(async (bufferModified, { line, column }) => {
  if (bufferModified) await updateService.update({ lineChange: true })
  const lineContent = await getCurrentLine()
  getCompletions(lineContent, line, column)
  getSignatureHint(lineContent)
})
