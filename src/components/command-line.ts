import { CommandUpdate, CommandType } from '../core/render'
import { PluginNormal } from '../components/plugin-container'
import { RowNormal } from '../components/row-container'
import Input from '../components/text-input2'
import { sub } from '../messaging/dispatch'
import { h } from '../ui/coffee'

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

const view = ($: State) => PluginNormal('command-line', $.vis, [

  ,Input({
    value: $.val,
    focus: true,
    icon: modeSwitch.get($.kind) || 'command',
  })

  // TODO: overflows. do the scrollable component thingy pls
  ,h('div', $.options.map((name, key) => RowNormal({ key, activeWhen: key === $.ix }, name)))

])


a.show = () => ({ vis: true })
a.hide = () => ({ vis: false, ix: -1, val: '', options: [] })
a.selectOption = (_s, _a, ix: number) => ({ ix })
a.updateOptions = (_s, _a, options) => ({ options, ix: -1 })
a.setKind = (_s, _a, kind: CommandType) => ({ kind })
a.updateValue = (s, _a, val: string) => {
  if (s.val !== val) return { val }
}

const ui = app({ state, view, actions: a }, false)

