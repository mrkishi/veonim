import { PluginBottom } from '../components/plugin-container'
import { connect, go } from '../state/trade-federation'
import { BufferSearch } from '../state/buffer-search'
import Input from '../components/text-input2'

const view = ({ data: $ }: { data: BufferSearch }) => PluginBottom($.visible, [

  ,Input({
    small: true,
    focus: true,
    value: $.value,
    icon: 'search',
    hide: go.hideBufferSearch,
    change: go.updateBufferSearchQuery,
    select: go.completeBufferSearch,
  })

])

export default connect(s => ({ data: s.bufferSearch }))(view)
