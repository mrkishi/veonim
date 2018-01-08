import { CommandUpdate, CommandType } from '../core/render'
import { Plugin, Row } from '../styles/common'
import { h, app, Actions } from '../ui/uikit'
import Input from '../components/text-input'
import { sub } from '../messaging/dispatch'

interface State {
  options: string[],
  cache: string[],
  vis: boolean,
  val: string,
  ix: number,
  kind: CommandType,
}

const state: State = {
  options: [],
  cache: [],
  vis: false,
  val: '',
  ix: 0,
  kind: CommandType.Ex,
}

let el: HTMLInputElement

const modeSwitch = new Map([
  [ CommandType.Ex, 'command' ],
  [ CommandType.Prompt, 'chevrons-right' ],
  [ CommandType.SearchForward, 'search' ],
  [ CommandType.SearchBackward, 'search' ],
])

const view = ($: State) => Plugin.default('command-line', $.vis, [

  ,Input({
    val: $.val,
    focus: true,
    icon: modeSwitch.get($.kind) || 'command',
  })

  // TODO: overflows. do the scrollable component thingy pls
  ,h('div', $.options.map((name, key) => Row.normal({ key, activeWhen: key === $.ix }, name)))

])

const a: Actions<State> = {}

a.show = () => ({ vis: true })
a.hide = () => ({ vis: false, ix: -1, val: '', options: [] })
a.selectOption = (_s, _a, ix: number) => ({ ix })
a.updateValue = (_s, _a, val: string) => ({ val })
a.updateOptions = (_s, _a, options) => ({ options, ix: -1 })
a.setKind = (_s, _a, kind: CommandType) => ({ kind })

const ui = app({ state, view, actions: a }, false)

// TODO: use export cns. this component is a high priority so it should be loaded early
// because someone might open cmdline early
sub('wildmenu.show', opts => ui.updateOptions(opts))
sub('wildmenu.select', ix => ui.selectOption(ix))
sub('wildmenu.hide', () => ui.updateOptions([]))

sub('cmd.hide', () => ui.hide())
sub('cmd.show', () => ui.show())
sub('cmd.update', ({ cmd, kind, position }: CommandUpdate) => {
  ui.show()
  ui.setKind(kind)
  cmd && ui.updateValue(cmd)
  setTimeout(() => el && el.setSelectionRange(position, position), 0)
  if (!cmd) ui.updateOptions([])
})
