import { h, app, style, Actions } from '../ui/uikit'
import { CommandUpdate } from '../core/render'
import { sub } from '../messaging/dispatch'

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

const Input = style('input')({
  display: 'flex',
  paddingLeft: '8px',
  background: '#222',
  color: '#999',
})

let el: HTMLInputElement

const view = ({ options, val, vis, ix }: State) => h('#wildmenu.plugin', {
  hide: !vis,
}, [
  h('.dialog.xlarge', [

    Input({
      value: val,
      onupdate: (e: HTMLInputElement) => {
        if (e) el = e
        e !== document.activeElement && e.focus()
      },
    }),

    h('div', options.map((name, key) => h('.row', {
      key,
      css: { active: key === ix },
    }, [
      h('span', name),
    ]))),

  ]),
])

const a: Actions<State> = {}

a.show = () => ({ vis: true })
a.hide = () => ({ vis: false, ix: -1, val: '', options: [] })
a.selectOption = (_s, _a, ix: number) => ({ ix })
a.updateValue = (_s, _a, val: string) => ({ val })
a.updateOptions = (_s, _a, options) => ({ options, ix: -1 })

const ui = app({ state, view, actions: a }, false)

// TODO: use export cns. this component is a high priority so it should be loaded early
// because someone might open cmdline eary
sub('wildmenu.show', opts => ui.updateOptions(opts))
sub('wildmenu.select', ix => ui.selectOption(ix))
sub('wildmenu.hide', () => ui.updateOptions([]))

sub('cmd.hide', () => ui.hide())
sub('cmd.show', () => ui.show())
sub('cmd.update', ({ cmd, position }: CommandUpdate) => {
  ui.show()
  ui.updateValue(cmd)
  el && el.setSelectionRange(position, position)
  if (!cmd) ui.updateOptions([])
})
