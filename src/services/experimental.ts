import { action, cmd } from '../core/neovim'
import { delay } from '../support/utils'

if (process.env.VEONIM_DEV) {

action('derp', async () => {
  cmd('cd $pr/plugin-manager')
  cmd('e src/main.ts')
})

action('derp:explorer', async () => {
  cmd('cd $pr/veonim')
  cmd('e src/bootstrap/main.ts')
  cmd('topleft vnew')
  await delay(250)
  cmd('vert resize 30')
  cmd('b Explorer')
})

const monitorEvents = [
  'keydown',
  'keyup',
  'keypress',
  'input',
  'beforeinput',
  'change',
  'focus',
  'blur',
  'resize',
]

let recordedEvents = [] as any[]
let captureEvents = true
let startTime = Date.now()
console.log('starting to capture for 10s')

monitorEvents.forEach(ev => window.addEventListener(ev, e => {
  if (!captureEvents) return
  console.log(ev, e)
  recordedEvents.push([ Date.now() - startTime, e ])
}))

setTimeout(() => {
  console.log('INSTANT REPLAY')
  captureEvents = false
  console.log(recordedEvents)
  recordedEvents.forEach(([ time, ev ]) => {
    setTimeout(() => {
      ev.target.dispatchEvent(ev)
    }, time)
  })
  recordedEvents = []
  captureEvents = true
}, 10e3)

// action('replay', () => {
//   captureEvents = false
//   recordedEvents.forEach(e => window.dispatchEvent(e))
//   recordedEvents = []
//   captureEvents = true
// })

// discover all events
// Object.keys(window).forEach(key => {
//   if (/on/.test(key)) console.log(key.slice(2))
// })
}
