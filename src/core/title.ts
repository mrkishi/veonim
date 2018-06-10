import * as canvasContainer from '../core/canvas-container'
import { onStateChange, current } from '../core/neovim'
import { merge, simplifyPath } from '../support/utils'
import * as dispatch from '../messaging/dispatch'
import { remote } from 'electron'

const macos = process.platform === 'darwin'
let titleBarVisible = false
const titleBar = macos && document.createElement('div')
const title = macos && document.createElement('div')

export const setTitleVisibility = (visible: boolean) => {
  if (!titleBar) return
  titleBarVisible = visible
  titleBar.style.display = visible ? 'flex' : 'none'
  canvasContainer.resize()
}

const typescriptSucks = (el: any, bar: any) => el.prepend(bar)

if (process.platform === 'darwin') {
  merge(titleBar.style, {
    height: '22px',
    color: 'var(--foreground-60)',
    background: 'var(--background-15)',
    '-webkit-app-region': 'drag',
    '-webkit-user-select': 'none',
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  })

  title.innerText = 'veonim'
  titleBar.appendChild(title)
  typescriptSucks(document.body, titleBar)
  titleBarVisible = true

  remote.getCurrentWindow().on('enter-full-screen', () => {
    setTitleVisibility(false)
    dispatch.pub('window.change')
  })

  remote.getCurrentWindow().on('leave-full-screen', () => {
    setTitleVisibility(true)
    dispatch.pub('window.change')
  })

  onStateChange.file((file: string) => {
    const path = simplifyPath(file, current.cwd)
    title.innerText = `${path} - veonim`
  })
}

else onStateChange.file((file: string) => {
  const path = simplifyPath(file, current.cwd)
  remote.getCurrentWindow().setTitle(`${path} - veonim`)
})

export const specs = {
  get height() {
    return titleBarVisible ? 22 : 0
  }
}
