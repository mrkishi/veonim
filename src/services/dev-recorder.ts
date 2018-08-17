import userSelectOption from '../components/generic-menu'
import { notify, NotifyKind } from '../ui/notifications'
import userPrompt from '../components/generic-prompt'
import * as storage from '../support/local-storage'
import { action } from '../core/neovim'
import finder from '@medv/finder'

if (process.env.VEONIM_DEV) {

interface RecordingEvent {
  kind: string
  when: number
  offsetStart: number
  offsetPrevious: number
  selector: string
  event: Event
}

interface Record {
  name: string
  events: RecordingEvent[]
}

const KEY = {
  ALL: 'veonim-dev-recordings',
  ONE: 'veonim-dev-recording-',
}

const monitorEvents = ['keydown', 'keyup', 'keypress', 'input', 'beforeinput', 'change', 'focus', 'blur']

let recordedEvents = [] as RecordingEvent[]
let captureEvents = false
let lastRecordedAt = Date.now()
let recordingStartTime = Date.now()

action('record-start', () => {
  // TODO: show in ui instead of log
  console.warn('RECORD - START')

  recordedEvents = []
  lastRecordedAt = Date.now()
  recordingStartTime = Date.now()
  captureEvents = true
})

action('record-stop', async () => {
  // TODO: show in ui instead of log
  console.warn('RECORD - STOP')

  captureEvents = false
  const recordingName = await userPrompt('recording name')

  storage.setItem(`veonim-dev-recording-${recordingName}`, {
    name: recordingName,
    events: recordedEvents,
  })

  const recordings = storage.getItem('veonim-dev-recordings', [])
  recordings.push(recordingName)
  storage.setItem(KEY.ALL, recordings)
})

action('record-replay', async () => {
  const recordingName = await userSelectOption<string>({
    description: 'select recording',
    options: getAllRecordings(),
  })

  const { name, events } = storage.getItem<Record>(recordingName)
  notify(`replaying "${name}" recording`, NotifyKind.System)
  recordPlayer(events)
})

action('record-remove', async () => {
  const recording = await userSelectOption<string>({
    description: 'select recording to REMOVE',
    options: getAllRecordings(),
  })

  if (!recording) return

  const recordings = storage.getItem<string[]>(KEY.ALL, [])
  const next = recordings.filter(m => m !== recording)
  storage.setItem(KEY.ALL, next)
})

action('record-remove-all', async () => {
  const confirmation = await userPrompt('type "yes" to remove all recordings')
  if (confirmation !== 'yes') return notify('did NOT remove all recordings', NotifyKind.Error)
  storage.removeItem('veonim-dev-recordings')
  notify('removed all recordings', NotifyKind.Success)
})

action('record-set-startup', async () => {
  const recordingName = await userSelectOption<string>({
    description: 'select recording',
    options: getAllRecordings(),
  })

  const { name, events } = storage.getItem(recordingName, {})
  notify(`DEV Recording: set "${name}" as startup replay`, NotifyKind.System)
  console.log('events', events)
})

const createEvent = (kind: string, event: Event) => {
  // InputEvent is still experimental - not widely supported but used in Chrome. No typings in TS lib
  if (kind.includes('input')) return new (window as any).InputEvent(kind, event)
  if (kind.includes('key')) return new KeyboardEvent(kind, event)
  else return new Event(kind, event)
}

const recordPlayer = (events: RecordingEvent[]) => {
  const replays = events.map(m => ({
    target: document.querySelector(m.selector),
    event: createEvent(m.kind, m.event),
    timeout: m.offsetStart,
  }))

  replays.filter(m => m.target).forEach(m => setTimeout(() => {
    m.target!.dispatchEvent(m.event)
  }, m.timeout))
}

const getAllRecordings = () => storage.getItem('veonim-dev-recordings', []).map((m: string) => ({
  key: `veonim-dev-recording-${m}`,
  value: m,
}))

monitorEvents.forEach(ev => window.addEventListener(ev, e => {
  if (!captureEvents) return

  recordedEvents.push({
    kind: e.type,
    when: Date.now(),
    offsetPrevious: Date.now() - lastRecordedAt,
    offsetStart: Date.now() - recordingStartTime,
    selector: finder(e.target as Element),
    event: evvy(e),
  })

  lastRecordedAt = Date.now()
}))
  
const props = [
  'altKey', 'bubbles', 'cancelBubble', 'cancelable', 'charCode', 'code',
  'composed', 'ctrlKey', 'data', 'dataTransfer', 'defaultPrevented', 'detail',
  'eventPhase', 'inputType', 'isComposing', 'isTrusted', 'key', 'keyCode',
  'location', 'metaKey', 'repeat', 'returnValue', 'shiftKey', 'type', 'which',
]

const evvy = (eo: any) => props.reduce((res, prop) => Object.assign(res, { [prop]: eo[prop] }), {}) as Event
}
