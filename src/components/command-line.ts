import { Plugin } from '../components/plugin-container'
import { RowNormal } from '../components/row-container'
import { connect } from '../state/trade-federation'
import { CommandLine } from '../state/command-line'
import Input from '../components/text-input2'
import { CommandType } from '../core/render'
import { h } from '../ui/uikit2'

const modeSwitch = new Map([
  [ CommandType.Ex, 'command' ],
  [ CommandType.Prompt, 'chevrons-right' ],
  [ CommandType.SearchForward, 'search' ],
  [ CommandType.SearchBackward, 'search' ],
])

const view = ({ data: $ }: { data: CommandLine }) => Plugin($.visible, [

  ,Input({
    focus: true,
    value: $.value,
    position: $.position,
    useVimInput: true,
    icon: modeSwitch.get($.kind) || 'command',
    desc: 'command line',
  })

  ,h('div', $.options.map((name, ix) => h(RowNormal, {
    key: name,
    active: ix === $.ix,
  }, [
    ,h('div', name)
  ])))

])

export default connect(s => ({ data: s.commandLine }))(view)
