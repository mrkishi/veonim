import { action, getCurrent, Highlight } from '../core/neovim'
import { remote } from 'electron'

action('quit', () => remote.app.quit())
action('devtools', () => remote.getCurrentWebContents().toggleDevTools())
action('fullscreen', () => {
  const win = remote.getCurrentWindow()
  win.setFullScreen(!win.isFullScreen())
})

let currentHighlight = 0

action('uadd', async () => {
  const buffer = await getCurrent.buffer
  currentHighlight = await buffer.addHighlight(-1, Highlight.Undercurl, 9, 18, 22)
  console.log('hi id:', currentHighlight)
})

action('uclear', async () => {
  const buffer = await getCurrent.buffer
  buffer.clearAllHighlights(currentHighlight)
})
