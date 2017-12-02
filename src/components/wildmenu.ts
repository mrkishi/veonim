import { CommandUpdate } from '../core/render'
import { h, app, Actions } from '../ui/uikit'
import { sub } from '../messaging/dispatch'
import TermInput from '../components/input'

interface State {
  options: string[],
  cache: string[],
  vis: boolean,
  val: string,
  ix: number,
}

const state: State = {
  options: [],
  cache: [],
  vis: false,
  val: '',
  ix: 0,
}

const view = ({ options, val, vis, ix }: State, { change, hide, select, next, prev }: any) => h('#wildmenu.plugin', {
  hide: !vis,
}, [
  h('.dialog.medium', [
    TermInput({ focus: true, val: '', next, prev, change, hide, select }),

    h('.row', val),

    h('div', options.map((name, key) => h('.row', {
      key,
      css: { active: key === ix },
    }, [
      h('span', name),
    ]))),

  ]),
])

const a: Actions<State> = {}

a.show = (_s, _a, options = []) => ({ options, vis: true })
a.hide = () => ({ vis: false, ix: -1, val: '' })
a.selectOption = (_s, _a, ix: number) => ({ ix })

a.wrender = (_s, _a, val: string) => ({ val })

a.change = (_s, _a, val: string) => {
  console.log('thing changed', val)
}

a.select = (s) => {
  const selection = s.options[s.ix]
  console.log('selected', selection)
}

const ui = app({ state, view, actions: a }, false)

// TODO: use export cns. this component is a high priority so it should be loaded early
// because someone might open cmdline eary
sub('wildmenu.show', opts => ui.show(opts))
sub('wildmenu.select', ix => ui.selectOption(ix))
sub('wildmenu.hide', () => ui.hide())

sub('cmd.show', () => ui.show())
sub('cmd.update', ({ cmd }: CommandUpdate) => (ui.show(), ui.wrender(cmd)))
