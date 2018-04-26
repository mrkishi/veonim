import { CreateTask, requireDir, log, delay as timeout } from '../support/utils'
import { resize, attachTo, create } from '../core/master-control'
import * as canvasContainer from '../core/canvas-container'
import configReader from '../config/config-reader'
import setDefaultSession from '../core/sessions'
import { sub } from '../messaging/dispatch'
import * as windows from '../core/windows'
import * as uiInput from '../core/input'
import '../ui/notifications'
import '../core/render'
import '../core/title'

const loadingConfig = CreateTask()

configReader('nvim/init.vim', c => {
  canvasContainer.setFont({
    face: c.get('font'),
    size: c.get('font_size')-0,
    lineHeight: c.get('line_height')-0
  })

  loadingConfig.done('')
})

sub('colors.vim.bg', color => {
  if (document.body.style.background !== color) document.body.style.background = color
})

canvasContainer.on('resize', ({ rows, cols }) => {
  resize(cols, rows)
  setImmediate(() => windows.render())
})

const main = async () => {
  const { id, path } = await create()
  await Promise.race([ loadingConfig.promise, timeout(500) ])
  resize(canvasContainer.size.cols, canvasContainer.size.rows)
  uiInput.focus()
  attachTo(id)
  setDefaultSession(id, path)

  setTimeout(() => {
    // TODO: can we load copmonents on demand?
    // aka, either load when user requests, or after 10 sec of app startup shit
    requireDir(`${__dirname}/../components`)
    setTimeout(() => require('../core/ai'))
  }, 1)

  // TODO: THIS SHOULD BE LOADED IN A WEB WORKER. WTF IS THIS SHIT DOING IN THE MAIN THREAD LOL
  // TODO: clearly we are not ready for this greatness
  setTimeout(() => require('../support/dependency-manager').default(), 100)
}

main().catch(log)

export const touched = () => {
  const start = document.getElementById('start')
  if (start) start.remove()
}
