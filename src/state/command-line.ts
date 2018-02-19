import { CommandUpdate, CommandType } from '../core/render'
import { on, initState } from '../state/trade-federation'
import { merge } from '../support/utils'

export interface CommandLine {
  options: string[],
  visible: boolean,
  value: string,
  ix: number,
  position: number,
  kind: CommandType,
}

initState('hover', {
  options: [],
  visible: false,
  value: '',
  ix: 0,
  position: 0,
  kind: CommandType.Ex,
} as CommandLine)

export interface Actions {
  updateCommandLine: (params: CommandUpdate) => void,
  showCommandLine: () => void,
  hideCommandLine: () => void,
  showWildmenu: (options: string[]) => void,
  selectWildmenu: (index: number) => void,
  hideWildmenu: () => void,
}

on.updateCommandLine((s, { cmd, kind, position }: CommandUpdate) => {
  merge(s.commandLine, {
    kind,
    position,
    visible: true,
  })

  if (!cmd) s.commandLine.options = []
})

on.showCommandLine(s => s.commandLine.visible = true)
on.hideCommandLine(s => s.commandLine.visible = false)

on.showWildmenu((s, options) => s.commandLine.options = options)
on.selectWildmenu((s, ix) => s.commandLine.ix = ix)
on.hideWildmenu(s => s.commandLine.options = [])
