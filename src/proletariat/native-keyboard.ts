import { start } from '../support/proletariat-server'
import * as iohook from 'iohook'
import { basename } from 'path'

// the reason this exists as a webworker if because iohook blocks the entire
// thread on startup. this has been observed at least on macos. also, i'm not
// sure i fully trust iohook as the main keyboard input event source, as it
// requires accessibility access, and it is a native module, thus complicating
// its usage. i think it would be good to gracefully fail if this functionality
// can not be loaded (even though some features might not be available)

interface IOHookKeyEvent {
  type: string
  keycode: number
  rawcode: number
  altKey: boolean
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
}

let paused = false
const { on, publish } = start(basename(__filename))
const listeningKeys = new Set<string>()

const keToStr = (e: IOHookKeyEvent) => [e.keycode, <any>e.ctrlKey|0, <any>e.metaKey|0, <any>e.altKey|0, <any>e.shiftKey|0].join('')

iohook.on('keydown', e => {
  if (paused) return
  const es = keToStr(e)
  if (listeningKeys.has(es)) publish.keyDown(es)
  console.log('KD:', es)
})

iohook.on('keyup', e => {
  if (paused) return
  const es = keToStr(e)
  if (listeningKeys.has(es)) publish.keyUp(es)
  console.log('KU:', es)
})

iohook.start(false)

on.listenFor((keys: string) => listeningKeys.add(keys))

on.pauseEventListeners(() => paused = true)
on.resumeEventListeners(() => paused = false)
