import { action, current as vimState, on } from '../ui/neovim'
const removeMarkdown = require('remove-markdown')
import * as hoverUI from '../ui/plugins/hover'
import { hover } from '../langserv/adapter'
import vimUI from '../ui/canvasgrid'
import Worker from '../worker'

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

  hoverUI.show({
    data,
    row: vimUI.cursor.row,
    col: vimUI.cursor.col
  })
})

on.cursorMove(() => hoverUI.hide())
on.insertEnter(() => hoverUI.hide())
on.insertLeave(() => hoverUI.hide())

