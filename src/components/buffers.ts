import { list, action, current, getCurrent, cmd } from '../core/neovim'
import { Plugin } from '../components/plugin-container'
import { RowNormal } from '../components/row-container'
import FiletypeIcon from '../components/filetype-icon'
import { VimBuffer } from '../core/vim-functions'
import { simplifyPath } from '../support/utils'
import Input from '../components/text-input'
import { basename, dirname } from 'path'
import { filter } from 'fuzzaldrin-plus'
import * as Icon from 'hyperapp-feather'
import { h, app } from '../ui/uikit'

interface BufferInfo {
  name: string,
  base: string,
  modified?: boolean,
  dir: string,
  duplicate: boolean,
}

const getVimBuffers = async () => {
  const buffers = await list.buffers
  const currentBufferId = (await getCurrent.buffer).id

  // TODO: filter out unlisted buffers?
  return await Promise.all(buffers.map(async b => ({
    name: await b.name,
    cur: b.id === currentBufferId,
    mod: await b.getOption('modified'),
  })))
}

const getBuffers = async (cwd: string): Promise<BufferInfo[]> => {
  const buffers = await getVimBuffers()
  if (!buffers) return []
  
  return buffers
    .filter((m: VimBuffer) => !m.cur)
    .map(({ name, mod }) => ({
      name,
      base: basename(name),
      modified: mod,
      dir: simplifyPath(dirname(name), cwd)
    }))
    .map((m, ix, arr) => ({ ...m, duplicate: arr.some((n, ixf) => ixf !== ix && n.base === m.base) }))
    .map(m => ({ ...m, name: m.duplicate ? `${m.dir}/${m.base}` : m.base }))
}

const state = {
  value: '',
  buffers: [] as BufferInfo[],
  cache: [] as BufferInfo[],
  visible: false,
  index: 0,
}

type S = typeof state

const resetState = { value: '', visible: false, index: 0 }

const actions = {
  select: () => (s: S) => {
    if (!s.buffers.length) return resetState
    const { name } = s.buffers[s.index]
    if (name) cmd(`b ${name}`)
    return resetState
  },

  change: (value: string) => (s: S) => ({ value, buffers: value
    ? filter(s.cache, value, { key: 'name' }).slice(0, 10)
    : s.cache.slice(0, 10)
  }),

  hide: () => resetState,
  show: (buffers: BufferInfo[]) => ({ buffers, cache: buffers, visible: true }),
  next: () => (s: S) => ({ index: s.index + 1 > Math.min(s.buffers.length - 1, 9) ? 0 : s.index + 1 }),
  prev: () => (s: S) => ({ index: s.index - 1 < 0 ? Math.min(s.buffers.length - 1, 9) : s.index - 1 }),
}

const view = ($: S, a: typeof actions) => Plugin($.visible, [

  ,Input({
    select: a.select,
    change: a.change,
    hide: a.hide,
    next: a.next,
    prev: a.prev,
    value: $.value,
    focus: true,
    icon: Icon.List,
    desc: 'switch buffer',
  })

  ,h('div', $.buffers.map((f, ix) => h(RowNormal, {
    key: `${f.name}-${f.base}-${f.dir}`,
    active: ix === $.index,
  }, [
    ,FiletypeIcon(f.name)

    ,h('span', {
      render: f.duplicate,
      style: { color: '#666' },
    }, `${f.dir}/`)

    ,h('span', f.duplicate ? f.base : f.name),
  ])))

])

const ui = app({ name: 'buffers', state, actions, view })
action('buffers', async () => ui.show(await getBuffers(current.cwd)))
