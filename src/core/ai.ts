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

nvim.on.filetype(filetype => filetypeDetectedStartServerMaybe(nvim.state.cwd, filetype))
nvim.watchState.colorscheme((color: string) => colorizer.call.setColorScheme(color))

// nvim.on.cursorMoveInsert(async () => {
//   // TODO: can't we get this from buffer notification events
//   // TODO: or can't we get this from screen rendered lines
//   console.time('getCurrentLine')
//   const lineContent = await nvim.getCurrentLine()
//   console.timeEnd('getCurrentLine')
//   getCompletions(lineContent, nvim.state.line, nvim.state.column)
//   getSignatureHint(lineContent)
// })
