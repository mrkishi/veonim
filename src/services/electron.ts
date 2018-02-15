import { action } from '../core/neovim'
import { remote } from 'electron'
import { go } from '../state/trade-federation'

action('hide', () => remote.app.hide())
action('quit', () => remote.app.quit())
action('maximize', () => remote.getCurrentWindow().maximize())
action('devtools', () => remote.getCurrentWebContents().toggleDevTools())
action('fullscreen', () => {
  const win = remote.getCurrentWindow()
  win.setFullScreen(!win.isFullScreen())
})

action('blarg', () => go.showHover())
