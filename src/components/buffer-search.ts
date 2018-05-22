import { action, current as vim, jumpTo, getCurrent, feedkeys } from '../core/neovim'
import { cursor as visualCursor, getCursorBoundingClientRect } from '../core/cursor'
import { PluginBottom } from '../components/plugin-container'
import colorizer, { ColorData } from '../services/colorizer'
import { getWindowContainerElement } from '../core/windows'
import { RowNormal } from '../components/row-container'
import { finder } from '../ai/update-server'
import Input from '../components/text-input'
import * as Icon from 'hyperapp-feather'
import { makel } from '../ui/vanilla'
import { app, h } from '../ui/uikit'
import { cvar } from '../ui/css'

interface FilterResult {
  line: string,
  start: {
    line: number,
    column: number,
  },
  end: {
    line: number,
    column: number,
  }
}

interface ColorizedFilterResult extends FilterResult {
  colorizedLine: ColorData[]
}

const cursor = (() => {
  let position = [0, 0]

  const save = async () => {
    const win = await getCurrent.window
    position = await win.cursor
  }

  const restore = async () => {
    const win = await getCurrent.window
    win.setCursor(position[0], position[1])
  }

  return { save, restore }
})()

const elementManager = (() => {
  let container: HTMLElement

  const show = (el: HTMLElement) => {
    container = getWindowContainerElement(visualCursor.row, visualCursor.col)
    container.appendChild(el)
  }
  const hide = (el: HTMLElement) => container && container.removeChild(el)

  return { show, hide }
})()

let elPosTop = 0

const captureOverlayPosition = () => setImmediate(() => {
  const { top } = element.getBoundingClientRect()
  elPosTop = top
})

const checkReadjustViewport = () => setTimeout(() => {
  // not the most performant
  // i tried using IntersectionObserver but it did not work i think because
  // both observed elements are absolutely positioned. all examples i've seen
  // are about detecting elements scrolling in/out of the viewport
  const { top } = getCursorBoundingClientRect()
  const hidden = top > elPosTop
  if (hidden) feedkeys('zz')
}, 10)

const state = {
  results: [] as ColorizedFilterResult[],
  highlightColor: 'pink',
  visible: false,
  query: '',
  index: -1,
}

type S = typeof state

const resetState = { visible: false, query: '', results: [], index: -1 }

const actions = {
  hide: () => {
    cursor.restore()
    elementManager.hide(componentElement)
    return resetState
  },
  show: () => {
    elementManager.show(componentElement)
    cursor.save()
    captureOverlayPosition()
    return { visible: true }
  },
  select: () => (s: S) => {
    jumpTo(s.results[s.index].start)
    return resetState
  },
  change: (query: string) => (_: S, a: A) => {
    finder.request.fuzzy(vim.cwd, vim.file, query).then(async (res: FilterResult[]) => {
      if (!res.length) return a.updateResults([])

      const textLines = res.map(m => m.line)
      const coloredLines: ColorData[][] = await colorizer.request.colorizePerChar(textLines, vim.filetype)

      const lines = coloredLines.filter(m => m.length).map((m, ix) => ({
        colorizedLine: m,
        ...res[ix],
      }))

      a.updateResults(lines)
    })
    return { query }
  },
  updateResults: (results: ColorizedFilterResult[]) => ({ results }),
  next: () => (s: S) => {
    if (!s.results.length) return

    const index = s.index + 1 > s.results.length - 1 ? 0 : s.index + 1

    jumpTo(s.results[index].start)
    checkReadjustViewport()

    return { index }
  },
  prev: () => (s: S) => {
    if (!s.results.length) return

    const index = s.index - 1 < 0 ? s.results.length - 1 : s.index - 1

    jumpTo(s.results[index].start)
    checkReadjustViewport()

    return { index }
  },
}

type A = typeof actions

const view = ($: S, a: A) => PluginBottom($.visible, [

  ,Input({
    hide: a.hide,
    next: a.next,
    prev: a.prev,
    change: a.change,
    select: a.select,
    value: $.query,
    focus: true,
    small: true,
    icon: Icon.Search,
    desc: 'find in buffer',
  })

  ,h('div', {
    style: {
      overflow: 'hidden',
    }
  }, $.results.map((res, pos) => h(RowNormal, {
    active: pos === $.index,
  }, res.colorizedLine.map(({ color, text, highlight }) => h('span', {
    style: {
      whiteSpace: 'pre',
      color: color || cvar('foreground'),
      background: highlight && 'rgba(255, 255, 255, 0.1)',
    }
  }, text)))))
])


const componentElement = makel({
  position: 'absolute',
  display: 'flex',
  height: '100%',
  width: '100%',
  zIndex: 90, // above cursor + cursorline
})

const element = makel({
  maxHeight: '40%',
  height: '40%',
  width: '100%',
  display: 'flex',
  overflow: 'hidden',
  alignSelf: 'flex-end',
})

componentElement.appendChild(element)

const ui = app({ name: 'buffer-search', state, actions, view, element })

action('buffer-search', ui.show)
