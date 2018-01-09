import { action } from '../core/neovim'
import { remote } from 'electron'

action('hide', () => remote.app.hide())
action('quit', () => remote.app.quit())
action('devtools', () => remote.getCurrentWebContents().toggleDevTools())
action('fullscreen', () => {
  const win = remote.getCurrentWindow()
  win.setFullScreen(!win.isFullScreen())
})
