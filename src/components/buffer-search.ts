import { action, current as vim, jumpTo, getCurrent } from '../core/neovim'
import colorizeWithHighlight from '../support/colorize-with-highlight'
import { PluginBottom } from '../components/plugin-container'
import colorizer, { ColorData } from '../services/colorizer'
import { RowNormal } from '../components/row-container'
import { finder } from '../ai/update-server'
import Input from '../components/text-input'
import * as Icon from 'hyperapp-feather'
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

const state = {
  results: [] as ColorizedFilterResult[],
  highlightColor: 'pink',
  visible: false,
  query: '',
  index: -1,
}

type S = typeof state

const resetState = { visible: false, query: '', results: [], index: 0 }

const actions = {
  hide: () => {
    cursor.restore()
    return resetState
  },
  show: () => {
    cursor.save()
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

      const colorGroups = lines.map(line => colorizeWithHighlight(line)).map((m, ix) => ({
        colorizedLine: m,
        ...res[ix],
      }))

      a.updateResults(colorGroups)
    })
    return { query }
  },
  updateResults: (results: ColorizedFilterResult[]) => ({ results }),
  // TODO: we will have an issue where we jump to a place in the buffer, but
  // the jumpTo location is behind the buffer-search overlay window.  maybe zz
  // or zt and adjust a few lines down? can we readjust only conditionally if
  // the jumpTo location is being covered by the overlay? how to determine if
  // it's being covered?
  next: () => (s: S) => {
    const index = s.index + 1 > s.results.length - 1 ? 0 : s.index + 1
    jumpTo(s.results[index].start)
    return { index }
  },
  prev: () => (s: S) => {
    const index = s.index - 1 < 0 ? s.results.length - 1 : s.index - 1
    jumpTo(s.results[index].start)
    return { index }
  },
  // TODO: virtual list? scroll list? what if select out of bounds/overflowd item?
}

type A = typeof actions

// TODO: this view should be part of the current vim window, not span the
// entire app window. need to get element from windows.ts (like getWindows())
const view = ($: S, a: A) => PluginBottom($.visible, {
  height: '40vh',
}, [

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
    // TODO: does this list scroll? what happens when we select entries that
    // are overflowed?
  }, $.results.map((res, pos) => h(RowNormal, {
    active: pos === $.index,
  }, res.colorizedLine.map(({ color, text, highlight }) => h('span', {
    style: {
      whiteSpace: 'pre',
      color: color || cvar('foreground'),
      background: highlight && 'rgba(255, 255, 255, 0.1)',
    }
  }, text)))))
  // TODO: should we display an empty (no results) image/placeholder/whatever
  // the cool kids call it these days?

])

const ui = app({ name: 'buffer-search', state, actions, view })

action('buffer-search', ui.show)
