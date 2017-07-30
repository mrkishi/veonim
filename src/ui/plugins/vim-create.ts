import { Actions, Events } from '../../utils'
import { createVim } from '../sessions'
import { h, app } from './plugins'
import TermInput from './input'

interface State { val: string, vis: boolean }
const state: State = { val: '', vis: false }

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
const view = ({ val, vis }: State, { select, hide, change }: any) => h('#vim-create', {
  style: vis ? container : hidden
}, [
  h('div', { style: pretty }, [
    TermInput({ focus: true, val, select, hide, change }),

    h('.row', [
      h('span', { style: { color: '#666' } }, 'creating new vim session: '),
      h('span', val)
    ])
  ])
])

const a: Actions<State> = {}

a.show = () => ({ vis: true }),
a.hide = () => ({ val: '', vis: false })
a.select = (s, a) => (createVim(s.val) && a.hide())
a.change = (_s, _a, val: string) => ({ val })

const e: Events<State> = {}
e.show = (_s, a) => a.show()

const emit = app({ state, view, actions: a, events: e })

export default () => emit('show')