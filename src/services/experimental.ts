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
    serializedEvent: eventToJSON(e),
  })
}))
  
const props = ['altKey', 'bubbles', 'cancelBubble', 'cancelable', 'charCode', 'code', 'composed', 'ctrlKey', 'currentTarget', 'data', 'dataTransfer', 'defaultPrevented', 'detail', 'eventPhase', 'inputType', 'isComposing', 'isTrusted', 'key', 'keyCode', 'location', 'metaKey', 'repeat', 'returnValue', 'shiftKey', 'sourceCapabilities', 'timeStamp', 'type', 'which']
const eventToJSON = (eo: any) => JSON.stringify(props.reduce((res, prop) => Object.assign(res, { [prop]: eo[prop] }), {}))

// discover all events
// Object.keys(window).forEach(key => {
//   if (/on/.test(key)) console.log(key.slice(2))
// })
}
