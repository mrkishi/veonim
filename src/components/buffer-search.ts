import { action, current as vim, jumpTo } from '../core/neovim'
import { PluginBottom } from '../components/plugin-container'
import { RowNormal } from '../components/row-container'
import { finder } from '../ai/update-server'
import Input from '../components/text-input'
import * as Icon from 'hyperapp-feather'
import { app, h } from '../ui/uikit'

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

const state = {
  results: [] as FilterResult[],
  visible: false,
  query: '',
  index: -1,
}

type S = typeof state

const resetState = { visible: false, query: '', results: [], index: 0 }

const actions = {
  // TODO: keep track of original position in buffer. if we find some results
  // and we jump through them, but we cancel (not select/hit enter on a result)
  // then the buffer should restore previous cursor and scroll positions as
  // when we opened buffer search
  hide: () => resetState,
  show: () => ({ visible: true }),
  select: () => (s: S) => {
    jumpTo(s.results[s.index].start)
    return resetState
  },
  change: (query: string) => (_: S, a: A) => {
    finder.request.fuzzy(vim.cwd, vim.file, query).then(a.updateResults)
    return { query }
  },
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
  updateResults: (results: FilterResult[]) => ({ results }),
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
  }, $.results.map((res, pos) => h(RowNormal, {
    active: pos === $.index,
  }, [

    // TODO: highlight search match?
    // TODO: lets try some syntax highlighting that might be nice
    ,h('span', res.line)

    // TODO: should we display an empty (no results) image/placeholder/whatever
    // the cool kids call it these days?

  ])))

])

const ui = app({ name: 'buffer-search', state, actions, view })

action('buffer-search', ui.show)
