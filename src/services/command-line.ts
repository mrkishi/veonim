import { go } from '../state/trade-federation'
import { sub } from '../messaging/dispatch'

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
  ui.updateValue(cmd)
  setTimeout(() => el && el.setSelectionRange(position, position), 0)
  if (!cmd) ui.updateOptions([])
})
