import { action, call, ex, current as vimState } from '../core/neovim'
import { references } from '../langserv/adapter'

action('references', async () => {
  const refs = await references(vimState)

  await call.setloclist(0, refs.map(m => ({
    lnum: m.line,
    col: m.column,
    text: m.desc
  })))

  ex('lopen')
  ex('wincmd p')
})
