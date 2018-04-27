import { Command, ChevronsRight, Search } from 'hyperapp-feather'
import { CommandType, CommandUpdate } from '../core/render'
import { Plugin } from '../components/plugin-container'
import { RowNormal } from '../components/row-container'
import Input from '../components/text-input'
import { sub } from '../messaging/dispatch'
import { is } from '../support/utils'
import { h, app } from '../ui/uikit'

const modeSwitch = new Map([
  [ CommandType.Ex, Command],
  [ CommandType.Prompt, ChevronsRight ],
  [ CommandType.SearchForward, Search ],
  [ CommandType.SearchBackward, Search ],
])

const state = {
  options: [] as string[],
  visible: false,
  value: '',
  ix: 0,
  position: 0,
  kind: CommandType.Ex,
}

type S = typeof state

const actions = {
  show: () => ({ visible: true }),
  hide: () => ({ visible: false }),
  update: ({ cmd, kind, position }: CommandUpdate) => (s: S) => ({
    kind,
    position,
    visible: true,
    options: cmd ? s.options : [],
    value: is.string(cmd) && s.value !== cmd
      ? cmd
      : s.value
  }),

  selectWildmenu: (ix: number) => ({ ix }),
  updateWildmenu: (options: string[]) => ({
    options: [...new Set(options)]
  }),
}

type A = typeof actions

const view = ($: S) => Plugin($.visible, [

  ,Input({
    focus: true,
    value: $.value,
    position: $.position,
    useVimInput: true,
    icon: modeSwitch.get($.kind) || Command,
    desc: 'command line',
  })

  ,h('div', $.options.map((name, ix) => h(RowNormal, {
    key: name,
    active: ix === $.ix,
  }, [
    ,h('div', name)
  ])))

])

const ui = app<S, A>({ name: 'command-line', state, actions, view })

// TODO: use export cns. this component is a high priority so it should be loaded early
// because someone might open cmdline early
sub('wildmenu.show', opts => ui.updateWildmenu(opts))
sub('wildmenu.select', ix => ui.selectWildmenu(ix))
sub('wildmenu.hide', () => ui.updateWildmenu([]))

sub('cmd.hide', ui.hide)
sub('cmd.show', ui.show)
sub('cmd.update', ui.update)
