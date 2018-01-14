import { action, onStateChange, current } from '../core/neovim'
import * as canvasContainer from '../core/canvas-container'
import { simplifyPath } from '../support/utils'

const titleBar = document.getElementById('title-bar') as HTMLElement
const title = document.querySelector('#title-bar > div') as HTMLElement

onStateChange.file((file: string) => {
  const path = simplifyPath(file, current.cwd)
  title.innerText = `${path} - veonim`
})

action('titlebar', () => {
  const hidden = titleBar.style.display === 'none'
  titleBar.style.display = hidden ? 'flex' : 'none'
  canvasContainer.resize()
})
