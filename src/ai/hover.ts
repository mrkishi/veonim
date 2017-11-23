import { action, current as vimState, on } from '../ui/neovim'
import { getColorData } from '../color-service'
import * as hoverUI from '../ui/plugins/hover'
import { hover } from '../langserv/adapter'
import vimUI from '../ui/canvasgrid'

action('hover', async () => {
  const text = await hover(vimState)
  if (!text) return
  const data = await getColorData(text, vimState.filetype)
  hoverUI.show({
    data,
    row: vimUI.cursor.row,
    col: vimUI.cursor.col
  })
})

on.cursorMove(() => hoverUI.hide())
on.insertEnter(() => hoverUI.hide())
on.insertLeave(() => hoverUI.hide())

