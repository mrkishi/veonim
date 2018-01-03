import { action, current as vimState, on } from '../core/neovim'
const removeMarkdown = require('remove-markdown')
import * as hoverUI from '../components/hover'
import { hover } from '../langserv/adapter'
import Worker from '../messaging/worker'
import { cursor } from '../core/cursor'

export interface ColorData {
  color: string,
  text: string,
}

export const colorizer = Worker('neovim-colorizer')

action('hover', async () => {
  const text = await hover(vimState)
  if (!text) return
  const cleanData = removeMarkdown(text)
  const data: ColorData[][] = await colorizer.request.colorize(cleanData, vimState.filetype)

  hoverUI.show({ data, row: cursor.row, col: cursor.col })
})

on.cursorMove(() => hoverUI.hide())
on.insertEnter(() => hoverUI.hide())
on.insertLeave(() => hoverUI.hide())
