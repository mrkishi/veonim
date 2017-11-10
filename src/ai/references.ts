import { references } from '../langserv/adapter'
import { action, call, ex } from '../ui/neovim'
import { fileInfo } from '../ai'

action('references', async () => {
  const refs = await references({ ...fileInfo() })

  await call.setloclist(0, refs.map(m => ({
    lnum: m.line,
    col: m.column,
    text: m.desc
  })))

  ex('lopen')
  ex('wincmd p')
})
