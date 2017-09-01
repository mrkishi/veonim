import { autocmd, expr } from '../neovim'
import { debounce } from '../../utils'
import { sub } from '../../dispatch'

// cursor in term is in wrong place. (double cursors)
// this is most likely a neovim bug as it is observed in other GUI clients.
// correct cursor is reported at some point, but the last cursor position
// goes back to the last place the cursor was in normal mode (term). :terminal
// draws it's own cursor.
// see: https://github.com/veonim/veonim/issues/65

// TODO: couldn't find a a
autocmd.bufEnter(debounce(async () => {
  const bufferType = await expr(`&buftype`)
  if (bufferType === 'terminal') { }
}, 100))

sub('mode', () => { })
