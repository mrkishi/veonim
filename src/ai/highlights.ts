import { highlights, references } from '../langserv/adapter'
import { action, current as vim } from '../core/neovim'
import { canCall } from '../langserv/director'

action('highlight', async () => {
  const highlightFeatureEnabled = canCall(vim.cwd, vim.filetype, 'documentHighlight')
  const positions = highlightFeatureEnabled
    ? await highlights(vim)
    : await references(vim)


  // TODO: create new highlight group
  // use nvim api to highlight positions

  if (process.env.VEONIM_DEV) {
    console.log('highlights', positions)
  }
})
