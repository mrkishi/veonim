import { InputMode, switchInputMode, watchInputMode, defaultInputMode } from '../core/input'
import { currentWindowElement, activeWindow } from '../core/windows'
import { cursor, hideCursor, showCursor } from '../core/cursor'
import { genList, merge } from '../support/utils'
import { Specs } from '../core/canvas-window'
import { makel } from '../ui/vanilla'
import { paddingV } from '../ui/css'
import * as grid from '../core/grid'
import nvim from '../core/neovim'

interface CellPosition {
  row: number
  col: number
}

interface FindPosOpts extends Specs {
  fg?: string
  bg?: string
}

// hand crafted for maximum ergonomic comfort
const labels = {
  single: ['a', 's', 'd', 'f', 'j', 'k', 'l', 'g', 'h', 'w', 'e', 'r', 'i', 'o', 'q', 't', 'u', 'p', 'n', 'm', 'v', 'b', 'c'],
  double: [
    'aj', 'ak', 'al', 'ah', 'an', 'ai', 'ao', 'au', 'ap', 'am', 'as', 'ad', 'af', 'ag', 'ae', 'ar', 'aw', 'at', 'av',
    'sj', 'sk', 'sl', 'sh', 'sn', 'si', 'so', 'su', 'sp', 'sm', 'sa', 'sd', 'sf', 'sg', 'se', 'sr',
    'dj', 'dk', 'dl', 'dh', 'dn', 'di', 'do', 'du', 'dp', 'dm', 'da', 'ds', 'df', 'dg', 'dw', 'dq', 'de', 'dv',
    'fj', 'fk', 'fl', 'fh', 'fn', 'fi', 'fo', 'fu', 'fp', 'fm', 'fa', 'fs', 'fd', 'fe', 'fw', 'fq',
    'ej', 'ek', 'el', 'eh', 'en', 'ei', 'eo', 'eu', 'ep', 'em', 'ef', 'eg', 'er', 'et', 'ew', 'eq', 'ea', 'es', 'ev',
    'rj', 'rk', 'rl', 'rh', 'rn', 'ri', 'ro', 'ru', 'rp', 'rm', 'ra', 'rs', 're', 'rw', 'rq', 'rg',
    'wj', 'wk', 'wl', 'wh', 'wn', 'wi', 'wo', 'wu', 'wp', 'wm', 'wa', 'wd', 'wf', 'we', 'wr', 'wt', 'wg', 'wv',
    'qj', 'qk', 'ql', 'qh', 'qn', 'qi', 'qo', 'qu', 'qp', 'qm', 'qd', 'qf', 'qw', 'qe', 'qr', 'qt', 'qg',
    'gj', 'gk', 'gl', 'gh', 'gn', 'gi', 'go', 'gu', 'gp', 'gm', 'gd', 'gs', 'ga', 'ge', 'gw', 'gq',
    'ja', 'js', 'jd', 'jf', 'jg', 'je', 'jr', 'jw', 'jq', 'jk', 'jl', 'ji', 'jo', 'jp', 'jv',
    'ka', 'ks', 'kd', 'kf', 'kg', 'ke', 'kr', 'kw', 'kq', 'kj', 'kl', 'kn', 'ko', 'kp', 'kv',
    'la', 'ls', 'ld', 'lf', 'lg', 'le', 'lr', 'lw', 'lq', 'lj', 'lk', 'ln', 'li', 'lu', 'lv',
    'ha', 'hs', 'hd', 'hf', 'hg', 'he', 'hr', 'hw', 'hq', 'hj', 'hl', 'hi', 'ho', 'hp', 'hv',
    'na', 'ns', 'nd', 'nf', 'ng', 'ne', 'nr', 'nw', 'nq', 'nk', 'nl', 'ni', 'no', 'np', 'nv',
    'ia', 'is', 'id', 'if', 'ig', 'ie', 'ir', 'iw', 'iq', 'ij', 'il', 'in', 'ih', 'io', 'ip', 'iv',
    'oa', 'os', 'od', 'of', 'og', 'oe', 'or', 'ow', 'oq', 'oj', 'ok', 'oh', 'oi', 'on', 'op', 'ov',
    'pa', 'ps', 'pd', 'pf', 'pg', 'pe', 'pr', 'pw', 'pq', 'pj', 'pk', 'ph', 'pi', 'pn', 'po', 'pv',
    'ma', 'ms', 'md', 'mf', 'mg', 'me', 'mr', 'mw', 'mq', 'mk', 'ml', 'mi', 'mo', 'mp', 'mv',
    'vj', 'vk', 'vl', 'vh', 'vn', 'vi', 'vo', 'vp', 'vu', 'vm', 'va', 'vs', 'vd', 've', 'vr', 'vw', 'vq',
    'ua', 'us', 'ud', 'uf', 'ug', 'ue', 'ur', 'uw', 'uq', 'uh', 'ul', 'ui', 'up', 'un', 'uv',
    'tj', 'tk', 'tl', 'th', 'tn', 'ti', 'to', 'tp', 'tu', 'tm', 'ta', 'te', 'tw', 'tq', 'tr',
  ],
}

const singleLabelLimit = labels.single.length
const doubleLabelLimit = labels.double.length

const getLabels = (itemCount: number) => {
  const doubleSize = itemCount > singleLabelLimit
  return {
    labelSize: doubleSize
      ? doubleLabelLimit
      : singleLabelLimit,
    getLabel: (index: number) => doubleSize
      ? labels.double[index]
      : labels.single[index],
    // TODO: would it be faster to use a map? only lookup instead of find
    indexOfLabel: (label: string) => doubleSize
      ? labels.double.indexOf(label)
      : labels.single.indexOf(label),
  }
}

nvim.onAction('divination', () => {
  const win = activeWindow()
  if (!win) throw new Error('no window found for divination purposes lol wtf')

  const { height: rowCount, row } = win.getSpecs()
  // TODO: don't render on the current line. account for missing in jumpDistance calcs?
  const rowPositions = genList(rowCount, ix => win.relativeRowToY(ix))
  const relativeCursorRow = cursor.row - row

  const labelContainer = makel({
    position: 'absolute'
  })

  const { labelSize, getLabel, indexOfLabel } = getLabels(rowPositions.length)

  const labels = rowPositions.map((y, ix) => {
    const el = makel({
      ...paddingV(4),
      position: 'absolute',
      fontSize: '1.1rem',
      top: `${y}px`,
      left: '8px',
      background: '#000',
      color: '#eee',
    })

    const label = getLabel(ix)
    // using margin-right instead of letter-spacing because letter-spacing adds space
    // to the right of the last letter - so it ends up with more padding on the right :/
    el.innerHTML = `<span style="margin-right: 2px">${label[0]}</span><span>${label[1]}</span>`
    return el
  })

  labels.forEach(label => labelContainer.appendChild(label))
  currentWindowElement.add(labelContainer)

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
    currentWindowElement.remove(labelContainer)
    defaultInputMode()
  }

  const joinTheDarkSide = () => {
    const jumpLabel = grabbedKeys.join('').toUpperCase()

    const targetRow = indexOfLabel(jumpLabel)
    const jumpDistance = targetRow - relativeCursorRow
    const jumpMotion = jumpDistance > 0 ? 'j' : 'k'
    nvim.feedkeys(`${Math.abs(jumpDistance)}g${jumpMotion}^`, 'n')

    reset()
  }

  const stopWatchingInput = watchInputMode(InputMode.Motion, keys => {
    if (keys === '<Esc>') return reset()

    grabbedKeys.push(keys)
    if (labelSize === 1 && grabbedKeys.length === 1) joinTheDarkSide()
    if (labelSize === 2 && grabbedKeys.length === 1) return updateLabels(keys)
    if (labelSize === 2 && grabbedKeys.length === 2) joinTheDarkSide()
  })
})

const findSearchPositions = ({ row, col, height, width, bg }: FindPosOpts) => {
  const maxRow = row + height
  const maxCol = col + width

  let lastCellWasARegularCell = true
  const searchPositions: CellPosition[] = []

  for (let rowIx = row; rowIx < maxRow; rowIx++) {
    for (let colIx = col; colIx < maxCol; colIx++) {
      const [ /*char*/, /*cellFg*/, cellBg ] = grid.get(rowIx, colIx)
      // TODO: don't know if this will ever be good with trying
      // to match search highlights from color information noly
      // ( see below for more comments )
      const isSearchCell = cellBg === bg
      // const isSearchCell = cellFg === fg && cellBg === bg 

      if (lastCellWasARegularCell && isSearchCell) {
        searchPositions.push({ row: rowIx, col: colIx })
        lastCellWasARegularCell = false
      }

      if (!isSearchCell) lastCellWasARegularCell = true
    }
  }

  return searchPositions
}

export const divinationSearch = async () => {
  const win = activeWindow()
  if (!win) throw new Error('no window found for divination purposes lol wtf')

  const { foreground, background } = await nvim.getColor('Search')
  const specs = win.getSpecs()

  const searchPositions = findSearchPositions({
    ...specs,
    // TODO: this is a real shit way of doing it. getColor returns
    // us the color defined in the colorscheme. color can be reversed
    // but we don't know if it is reversed or not and how to compare.
    // also if we specify a color as NONE, getColor will return
    // some default value (#000 observed) but the rendered color
    // inherits the color from somewhere else

    // background and foreground are swapped in vim colorscheme
    // for Search highlight group (because of gui=reverse)
    fg: background,
    bg: foreground,
  })

  // TODO: again, same issue as above, remove/filter out the current line + col
  // if mouse is right on top of it
  const searchPixelPositions = searchPositions.map(m => ({
    ...m,
    ...win.realtivePositionToPixels(m.row, m.col),
  }))

  const labelContainer = makel({ position: 'absolute' })
  const jumpTargets = new Map()

  const labels = searchPixelPositions.map((pos, ix) => {
    // TODO: these styles should be shared. also i think we should use css translate
    // instead of top/left
    const el = makel({
      ...paddingV(4),
      position: 'absolute',
      // TODO: this font-size depends on global font-size + line-height
      // may need to figure out a good way to determine the largest font-size
      // that we can display without overlapping!
      fontSize: '1.3rem',
      // TODO: need to figure out what to do when labels stack on top of each other???
      // like if two chars are highlighted right next to each other <2 spaces
      top: `${pos.y}px`,
      left: `${pos.x}px`,
      background: '#000',
      color: '#eee',
    })

    const label = jumpLabels[ix]
    jumpTargets.set(label, { row: pos.row, col: pos.col })
    // using margin-right instead of letter-spacing because letter-spacing adds space
    // to the right of the last letter - so it ends up with more padding on the right :/
    el.innerHTML = `<span style="margin-right: 2px">${label[0]}</span><span>${label[1]}</span>`
    return el
  })

  // TODO: dedup some of this code for label creation
  labels.forEach(label => labelContainer.appendChild(label))
  currentWindowElement.add(labelContainer)

  const updateLabels = (matchChar: string) => labels
    .filter(m => (m.children[0] as HTMLElement).innerText.toLowerCase() === matchChar)
    .forEach(m => merge((m.children[0] as HTMLElement).style, {
      // TODO: inherit from colorscheme
      color: '#ff007c'
    }))

  switchInputMode(InputMode.Motion)
  hideCursor()
  const grabbedKeys: string[] = []

  const reset = () => {
    stopWatchingInput()
    currentWindowElement.remove(labelContainer)
    defaultInputMode()
    showCursor()
  }

  const joinTheDarkSide = async () => {
    const jumpLabel = grabbedKeys.join('').toUpperCase()
    const { row, col } = jumpTargets.get(jumpLabel)

    const distanceFrom = {
      top: row - specs.row,
      left: col - specs.col,
    }

    const target = {
      line: nvim.state.editorTopLine + distanceFrom.top - 1,
      column: distanceFrom.left,
    }

    nvim.jumpTo(target)
    reset()
  }

  const stopWatchingInput = watchInputMode(InputMode.Motion, keys => {
    if (keys === '<Esc>') return reset()

    grabbedKeys.push(keys)
    if (grabbedKeys.length === 1) return updateLabels(keys)
    if (grabbedKeys.length === 2) joinTheDarkSide()
  })
}

nvim.onAction('divination-search', divinationSearch)
