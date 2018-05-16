import { PluginBottom } from '../components/plugin-container'
import { action, current as vim } from '../core/neovim'
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
  cache: [] as FilterResult[],
  visible: false,
  query: '',
  index: 0,
}

type S = typeof state

const actions = {
  show: () => ({ visible: true }),
  hide: () => ({ visible: false, query: '' }),
  change: (query: string) => (s: S, a: A) => {
    finder.request.fuzzy(vim.cwd, vim.file, query).then((res: FilterResult[]) => {
      if (!s.cache.length) a.updateCache(res)
      a.updateResults(res)
    })

    return { query }
  },
  updateResults: (results: FilterResult[]) => ({ results }),
  updateCache: (cache: FilterResult[]) => ({ cache }),
  next: () => (s: S) => ({ index: s.index + 1 > s.results.length - 1 ? 0 : s.index + 1 }),
  prev: () => (s: S) => ({ index: s.index - 1 < 0 ? s.results.length - 1 : s.index - 1 }),
}

type A = typeof actions

const view = ($: S, a: A) => PluginBottom($.visible, {
  height: '40vh',
}, [

  ,Input({
    hide: a.hide,
    next: a.next,
    prev: a.prev,
    change: a.change,
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
    ,h('span', res.line)

  ])))

])

const ui = app({ name: 'buffer-search', state, actions, view })

// TODO: fill cache with current buffer lines
action('buffer-search', ui.show)
