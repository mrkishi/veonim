import { hideCursor, showCursor } from '../core/cursor'
import { on } from '../core/neovim'

// neovim terminal mode draws its own cursor, and the gui cursor location is
// not in the same place as the terminal mode cursor - in fact nvim presents
// the cursor location as the last normal mode cursor position. nvim bug: this
// is a temp workaround to hide the second cursor
on.termEnter(() => hideCursor())
on.termLeave(() => showCursor())
