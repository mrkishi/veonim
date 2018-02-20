import { Plugin } from '../components/plugin-container'
import { RowNormal } from '../components/row-container'
import { connect, go } from '../state/trade-federation'
import { BufferSearch } from '../state/buffer-search'
import Input from '../components/text-input2'
import { h } from '../ui/coffee'

const view = ({ data: $ }: { data: BufferSearch }) => Plugin('buffer-search', $.visible, [

  ,Input({
    focus: true,
    value: $.value,
    icon: 'search',
    hide: go.hideBufferSearch,
    change: val => go.updateBufferSearchQuery(val),
  })

  ,h('div', $.options.map((name, ix) => h(RowNormal, {
    key: name,
    active: ix === 0,
  }, [
    ,h('div', name)
  ])))

])

export default connect(s => ({ data: s.bufferSearch }))(view)

