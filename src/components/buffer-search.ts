import { PluginBottom } from '../components/plugin-container'
import { connect, go } from '../state/trade-federation'
import { BufferSearch } from '../state/buffer-search'
import Input from '../components/text-input2'
import { normal } from '../core/neovim'

const view = ({ data: $ }: { data: BufferSearch }) => PluginBottom('buffer-search', $.visible, [

  ,Input({
    small: true,
    focus: true,
    value: $.value,
    icon: 'search',
    hide: go.hideBufferSearch,
    change: val => go.updateBufferSearchQuery(val),
    // TODO: this jump is not good enough.
    // should get line + column of top fuzzy match
    // then verify if current cursor is at line+column, if not move it there
    select: () => go.hideBufferSearch() && normal(`nN`),
  })

])

export default connect(s => ({ data: s.bufferSearch }))(view)
