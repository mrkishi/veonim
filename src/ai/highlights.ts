import { action, current as vimState } from '../core/neovim'
import { highlights } from '../langserv/adapter'

action('highlight', async () => {
  const positions = await highlights(vimState)

  // TODO: not implemented for TS. need to check capabilities before calling!
  // actually could call references as a fallback, since they both present
  // roughly the same data (usually identical, no?)

  // TODO: create new highlight group
  // use nvim api to highlight positions

  if (process.env.VEONIM_DEV) {
    console.log('highlights', positions)
  }
})
