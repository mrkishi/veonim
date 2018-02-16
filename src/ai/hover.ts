import { action, current as vimState, on } from '../core/neovim'
import * as markdown from '../support/markdown'
import { go } from '../state/trade-federation'
import { hover } from '../langserv/adapter'
import Worker from '../messaging/worker'

export interface ColorData {
  color: string,
  text: string,
}

export const colorizer = Worker('neovim-colorizer')

action('hover', async () => {
  const { value, doc } = await hover(vimState)
  if (!value) return
  const cleanData = markdown.remove(value)
  const data: ColorData[][] = await colorizer.request.colorize(cleanData, vimState.filetype)

  go.showHover({ data, doc })
})

on.cursorMove(() => go.hideHover())
on.insertEnter(() => go.hideHover())
on.insertLeave(() => go.hideHover())
