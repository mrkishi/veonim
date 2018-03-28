import { Plugin } from '../components/plugin-container'
import { RowNormal } from '../components/row-container'
import { connect } from '../state/trade-federation'
import Input from '../components/text-input2'
import { Explorer } from '../state/explorer'
import { h } from '../ui/coffee'

const ui = ($: Explorer) => [

  ,Input({
    focus: true,
    value: $.value,
    icon: 'command',
    desc: 'explorer',
  })

  ,h('div', $.paths.map(({ name, dir }, ix) => h(RowNormal, {
    key: name,
    active: ix === $.index,
  }, [
    ,h('span', { style: {
      color: dir && ix !== $.index ? 'var(--foreground-50)' : undefined,
    } }, name)
  ])))

]

const view = ({ data: $ }: { data: Explorer }) => Plugin('explorer2', $.visible, ui($))
// const embedView = ({ data: $ }: { data: Explorer }) => h('div', ui($))

// export default connect(s => ({ data: s.explorer }))(embedView)
export const embed = connect(s => ({ data: s.explorer }))(view)
