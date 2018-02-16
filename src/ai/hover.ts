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

  // TODO: split each group by word
  // ['hello world how', 'are you today?']
  // ['hello', 'world', 'how', 'are', 'you', 'today']
  go.showHover({ data, doc })
})

on.cursorMove(() => go.hideHover())
on.insertEnter(() => go.hideHover())
on.insertLeave(() => go.hideHover())
