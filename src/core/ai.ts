import { filetypeDetectedStartServerMaybe } from '../langserv/director'
import { getSignatureHint } from '../ai/signature-hint'
import { getCompletions } from '../ai/completions'
import colorizer from '../services/colorizer'
import nvim from '../core/neovim'
import '../ai/diagnostics'
import '../ai/references'
import '../ai/definition'
import '../ai/highlights'
import '../ai/symbols'
import '../ai/rename'
import '../ai/hover'

nvim.on.filetype(filetype => {
  filetypeDetectedStartServerMaybe(nvim.state.cwd, filetype)
})

nvim.watchState.colorscheme((color: string) => colorizer.call.setColorScheme(color))

// TODO: re-enable getCompletions + getSignatureHint
// how to ensure that we only call completions/signature hint after
// the language server has been updated with the changed content?

// using cursor move with a diff on revision number because we might need to
// update the lang server before triggering completions/hint lookups. using
// textChangedI + cursorMovedI would make it very difficult to wait in cursorMovedI
// until textChangedI ran AND updated the server
//
// nvim.on.cursorMoveInsert(async (bufferModified) => {
//   if (bufferModified) await updateService.update({ lineChange: true })
//   const lineContent = await nvim.getCurrentLine()
//   getCompletions(lineContent, nvim.state.line, nvim.state.column)
//   getSignatureHint(lineContent)
// })
