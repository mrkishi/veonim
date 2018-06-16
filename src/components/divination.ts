import { InputMode, switchInputMode, watchInputMode, defaultInputMode } from '../core/input'
import { getWindowContainerElement, activeWindow } from '../core/windows'
import { genList, merge } from '../support/utils'
import { action, feedkeys } from '../core/neovim'
import { cell } from '../core/canvas-container'
import { cursor } from '../core/cursor'
import { makel } from '../ui/vanilla'
import { paddingV } from '../ui/css'

const jumpKeys = 'ASDFLGHQWERTYUIOPBNMCBVJK'

// TODO: generate more ergonomic labels
// for example, 'sw' is harder to type than 'ad'
// also multi-hand might be better. aka 'aj' > 'ad'
// perhaps we can also create some convention for
// motions that go up vs down. e.g. if first label char...
//  - starts on left hand: motion is down
//  - starts on right hand: motion is up
// not sure if this makes things faster?
const jumpLabels = jumpKeys.split('').map(key => {
  const otherKeys = jumpKeys.replace(key, '')
  return otherKeys.split('').map(k => key + k)
}).reduce((res, grp) => [...res, ...grp])

action('divination', () => {
  const winContainer = getWindowContainerElement(cursor.row, cursor.col)
  const win = activeWindow()
  if (!win || !winContainer) throw new Error('no window found for divination purposes lol wtf')

  const { height: rowCount, row } = win.getSpecs()
  // TODO: don't render on the current line. account for missing in jumpDistance calcs?
  const rowPositions = genList(rowCount, ix => win.relativeRowToY(ix) + cell.padding)
  const relativeCursorRow = cursor.row - row

  const labelContainer = makel('div', {
    position: 'absolute'
  })

  const labels = rowPositions.map((y, ix) => {
    const el = makel('div', {
      ...paddingV(4),
      position: 'absolute',
      fontSize: '1.1rem',
      top: `${y}px`,
      left: '8px',
      background: '#000',
      color: '#eee',
    })

    const label = jumpLabels[ix]
    // using margin-right instead of letter-spacing because letter-spacing adds space
    // to the right of the last letter - so it ends up with more padding on the right :/
    el.innerHTML = `<span style="margin-right: 2px">${label[0]}</span><span>${label[1]}</span>`
    return el
  })

  labels.forEach(label => labelContainer.appendChild(label))
  winContainer.appendChild(labelContainer)

  const updateLabels = (matchChar: string) => labels
    .filter(m => (m.children[0] as HTMLElement).innerText.toLowerCase() === matchChar)
    .forEach(m => merge((m.children[0] as HTMLElement).style, {
      // TODO: inherit from colorscheme
      color: '#ff007c'
    }))

  switchInputMode(InputMode.Motion)
  const grabbedKeys: string[] = []

  const reset = () => {
    stopWatchingInput()
    winContainer.removeChild(labelContainer)
    defaultInputMode()
  }

  const joinTheDarkSide = () => {
    const jumpLabel = grabbedKeys.join('').toUpperCase()

    const targetRow = jumpLabels.indexOf(jumpLabel)
    const jumpDistance = targetRow - relativeCursorRow
    const jumpMotion = jumpDistance > 0 ? 'j' : 'k'
    feedkeys(`${Math.abs(jumpDistance)}g${jumpMotion}`, 'n')

    reset()
  }

  const stopWatchingInput = watchInputMode(InputMode.Motion, keys => {
    if (keys === '<Esc>') return reset()

    grabbedKeys.push(keys)
    if (grabbedKeys.length === 1) return updateLabels(keys)
    if (grabbedKeys.length === 2) joinTheDarkSide()
  })
})
