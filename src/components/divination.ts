import { getWindowContainerElement, activeWindow } from '../core/windows'
import { genList, merge } from '../support/utils'
import { action, feedkeys } from '../core/neovim'
import { cell } from '../core/canvas-container'
import { cursor } from '../core/cursor'
import * as input from '../core/input'
import { makel } from '../ui/vanilla'
import { paddingV } from '../ui/css'

const jumpKeys = 'ASDFLGHQWERTYUIOPBNMCBVJK'

const jumpLabels = jumpKeys.split('').map(key => {
  const otherKeys = jumpKeys.replace(key, '')
  return otherKeys.split('').map(k => key + k)
}).reduce((res, grp) => [...res, ...grp])

action('divination', () => {
  const winContainer = getWindowContainerElement(cursor.row, cursor.col)
  const win = activeWindow()
  if (!win || !winContainer) throw new Error('no window found for divination purposes lol wtf')

  const { height: rowCount, row } = win.getSpecs()
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
      color: 'white',
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

  input.blur()
  const grabbedKeys: string[] = []

  const joinTheDarkSide = () => {
    const jumpLabel = grabbedKeys.join('')

    const targetRow = jumpLabels.indexOf(jumpLabel)
    const jumpDistance = targetRow - relativeCursorRow
    const jumpMotion = jumpDistance > 0 ? 'j' : 'k'
    feedkeys(`${Math.abs(jumpDistance)}g${jumpMotion}`, 'n')

    window.removeEventListener('keydown', keyHandler)
    winContainer.removeChild(labelContainer)
    input.focus()
  }

  const keyHandler = ({ key }: KeyboardEvent) => {
    grabbedKeys.push(key)
    if (grabbedKeys.length === 1) return updateLabels(key)
    if (grabbedKeys.length === 2) joinTheDarkSide()
  }

  window.addEventListener('keydown', keyHandler)
})
