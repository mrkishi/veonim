import { Actions, Events } from '../../utils'
import { renameCurrent, getCurrentName } from '../sessions'
import { h, app } from './plugins'
import TermInput from './input'

interface State { val: string, vis: boolean, current: string }
const state: State = { val: '', vis: false, current: '' }

const hidden = { display: 'none' }
const container = {
  display: 'flex',
  width: '100%',
  'justify-content': 'center',
  'align-items': 'flex-start',
}

const pretty = {
  width: '400px',
  background: '#333',
  'margin-top': '15%'
}

// TODO: create wrapper for this same pattern in every plugin
const view = ({ val, vis, current }: State, { select, hide, change }: any) => h('#vim-rename', {
  style: vis ? container : hidden
}, [
  h('div', { style: pretty }, [
    TermInput({ focus: true, val, select, hide, change }),

    h('.row', [
      h('span', { style: { color: '#666' } }, 'renaming '),
      h('span', current),
      h('span', { style: { color: '#666' } }, ' to: '),
      h('span', val),
    ])
  ])
])

const a: Actions<State> = {}

a.show = (_s, _a, current: string) => ({ current, vis: true }),
a.hide = () => ({ val: '', vis: false })
a.change = (_s, _a, val: string) => ({ val })
a.select = (s, a) => {
  renameCurrent(s.val)
  a.hide()
}

const e: Events<State> = {}
e.show = (_s, a, current: string) => a.show(current)

const emit = app({ state, view, actions: a, events: e })

export default () => emit('show', getCurrentName())