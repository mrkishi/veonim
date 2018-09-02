import { hideCursor, showCursor } from '../core/cursor'
import nvim from '../core/neovim'

// TODO: this might not be needed with nvim external windows multigrid

// neovim terminal mode draws its own cursor, and the gui cursor location is
// not in the same place as the terminal mode cursor - in fact nvim presents
// the cursor location as the last normal mode cursor position. nvim bug: this
// is a temp workaround to hide the second cursor
nvim.on.termEnter(() => hideCursor())
nvim.on.termLeave(() => showCursor())
