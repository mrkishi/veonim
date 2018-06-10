import { setTitleVisibility } from '../core/title'
import { action } from '../core/neovim'
import { remote } from 'electron'

action('hide', () => remote.app.hide())
action('quit', () => remote.app.quit())
action('maximize', () => remote.getCurrentWindow().maximize())
action('devtools', () => remote.getCurrentWebContents().toggleDevTools())
action('fullscreen', simple => {
  const simpleFullscreen = process.platform === 'darwin' && simple
  const win = remote.getCurrentWindow()

  if (!simpleFullscreen) return win.setFullScreen(!win.isFullScreen())

  win.setSimpleFullScreen(!win.isSimpleFullScreen())
  setTitleVisibility(!win.isSimpleFullScreen())
})
