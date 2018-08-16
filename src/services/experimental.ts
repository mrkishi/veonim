import { action, cmd } from '../core/neovim'
import { delay } from '../support/utils'
import finder from '@medv/finder'

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
let captureEvents = false
let startTime = Date.now()

action('replay-record', () => {
  console.warn('REPLAY --> starting capture')
  recordedEvents = []
  startTime = Date.now()
  captureEvents = true
})

action('replay-stop', () => {
  console.warn('REPLAY --> capture finished')
  captureEvents = false
  console.log(recordedEvents)
})

monitorEvents.forEach(ev => window.addEventListener(ev, e => {
  if (!captureEvents) return
  console.log(ev, e)
  recordedEvents.push({
    when: Date.now(),
    selector: finder(e.target),
    event: e,
    serializedEvent: simpleKeys(e),
  })
}))

// ref: https://stackoverflow.com/questions/11547672/how-to-stringify-event-object

const eventToJSON = (evt: any) => JSON.stringify(evt, function(_, v) {
  if (v instanceof Node) return 'Node'
  if (v instanceof Window) return 'Window'
  return v
}, ' ')

function simpleKeys (original) {
  return Object.keys(original).reduce(function (obj, key) {
    obj[key] = typeof original[key] === 'object' ? '{ ... }' : original[key];
    return obj;
  }, {});
}

// setTimeout(() => {
//   console.log('INSTANT REPLAY')
//   captureEvents = false
//   console.log(recordedEvents)
//   recordedEvents.forEach(([ time, ev ]) => {
//     setTimeout(() => {
//       ev.target.dispatchEvent(ev)
//     }, time)
//   })
//   recordedEvents = []
//   captureEvents = true
// }, 10e3)

// discover all events
// Object.keys(window).forEach(key => {
//   if (/on/.test(key)) console.log(key.slice(2))
// })
}
