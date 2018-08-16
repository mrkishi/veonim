import userSelectOption from '../components/generic-menu'
import userPrompt from '../components/generic-prompt'
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

const monitorEvents = ['keydown', 'keyup', 'keypress', 'input', 'beforeinput', 'change', 'focus', 'blur']

const recordings = new Map<string, any[]>()
let recordedEvents = [] as any[]
let captureEvents = false
let lastRecordedAt = Date.now()

action('replay-record', () => {
  console.warn('REPLAY --> starting capture')
  recordedEvents = []
  lastRecordedAt = Date.now()
  captureEvents = true
})

action('replay-stop', async () => {
  console.warn('REPLAY --> capture finished')
  captureEvents = false
  const recordingName = await userPrompt('recording name')
  recordings.set(recordingName, recordedEvents)
  console.log('recordings', recordings)
})

const recordingOptions = () => [...recordings.keys()].map(k => ({ key: k, value: k }))

action('replay', async () => {
  const recordingName = await userSelectOption({
    description: 'select recording',
    options: recordingOptions(),
  })

  const recording = recordings.get(recordingName)
  console.log('recording', recording)
})

monitorEvents.forEach(ev => window.addEventListener(ev, e => {
  if (!captureEvents) return

  recordedEvents.push({
    event: e,
    kind: e.type,
    when: Date.now(),
    offset: Date.now() - lastRecordedAt,
    selector: finder(e.target),
    serializedEvent: eventToJSON(e),
  })

  lastRecordedAt = Date.now()
}))
  
const props = [
  'altKey', 'bubbles', 'cancelBubble', 'cancelable', 'charCode', 'code',
  'composed', 'ctrlKey', 'data', 'dataTransfer', 'defaultPrevented', 'detail',
  'eventPhase', 'inputType', 'isComposing', 'isTrusted', 'key', 'keyCode',
  'location', 'metaKey', 'repeat', 'returnValue', 'shiftKey',
  'sourceCapabilities', 'timeStamp', 'type', 'which',
]

const eventToJSON = (eo: any) => JSON.stringify(props.reduce((res, prop) => Object.assign(res, { [prop]: eo[prop] }), {}))
}
