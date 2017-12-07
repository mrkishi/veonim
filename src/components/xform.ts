import { transform, remapModifier, registerShortcut } from '../core/input'
import { as, action, call, getCurrent } from '../core/neovim'
import { is, fromJSON } from '../support/utils'
import { px } from '../core/canvasgrid'
import { remote } from 'electron'
import { Script } from 'vm'

// TODO: deprecate remapModifier and use transform instead?
action('remap-modifier', (from, to) => remapModifier(from, to))
action('register-shortcut', key => registerShortcut(key, () => call.VeonimCallEvent(`key:${key}`)))

action('key-transform', (type, matcher, transformer) => {
  const fn = Reflect.get(transform, type)
  const transformFn = new Script(transformer).runInThisContext()
  const matchObj = is.string(matcher) ? fromJSON(matcher).or({}) : matcher

  if (is.function(fn) && is.function(transformFn)) fn(matchObj, transformFn)
})

action('quit', () => remote.app.quit())
action('devtools', () => remote.getCurrentWebContents().toggleDevTools())
action('fullscreen', () => {
  const win = remote.getCurrentWindow()
  win.setFullScreen(!win.isFullScreen())
})

action('blarg', async () => {
  console.time('wins')
  const wins = await (await getCurrent.tab).windows
  const windows = await Promise.all(wins.map(async w => {
    const [ [ y, x ], buffer ] = await Promise.all([
      w.position,
      as.buf(w.buffer)
    ])

    return {
      x,
      y,
      number: await w.number,
      height: await w.height,
      width: await w.width,
      name: await buffer.name,
      // TODO: this is very annoying. i can't figure out what the proper key is here... i tried so many...
      //modified: await buffer.getVar('&modified'),
    }
  }))

  console.timeEnd('wins')

  // TODO: the problem here is that the side margin paddings is calculated with all the shit
  // we should extract the padding out of the canvas calculation
  // canvas should just look at it's container div instead of the window size
  // container div should dictate padding, not canvas
  const realWins = windows.map(w => ({
    name: w.name,
    x: px.col.x(w.x),
    y: px.row.y(w.y),
    width: px.col.width(w.width),
    height: px.row.height(w.height),
  }))

  const container = document.getElementById('grid') as HTMLElement

  const els = realWins.map(w => {
    const e = document.createElement('div')

    Object.assign(e.style, {
      position: 'absolute',
      border: '1px solid red',
      width: w.width + 'px',
      height: w.height + 'px',
      top: w.y + 'px',
      left: w.x + 'px',
    })

    return e
  })

  els.forEach(e => container.appendChild(e))

  // TODO: i think this lists all the windows present in the vim session.
  // i think we should use current tabpage and get list of windows from the tab
  realWins.forEach(w => console.log(w))
})
