import { go } from '../state/trade-federation'
import { sub } from '../messaging/dispatch'

// TODO: use export cns. this component is a high priority so it should be loaded early
// because someone might open cmdline early
//
// TODO: can we call trade-federation.go.action() from render? and skip this module
sub('wildmenu.show', opts => go.updateWildmenu(opts))
sub('wildmenu.select', ix => go.selectWildmenu(ix))
sub('wildmenu.hide', () => go.updateWildmenu([]))

sub('cmd.hide', go.hideCommandLine)
sub('cmd.show', go.showCommandLine)
sub('cmd.update', go.updateCommandLine)
