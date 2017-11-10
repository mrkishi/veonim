import { action, current as vimState, on } from '../ui/neovim'
import { getColorData } from '../color-service'
import * as hoverUI from '../ui/plugins/hover'
import { hover } from '../langserv/adapter'
import vimUI from '../ui/canvasgrid'

action('hover', async () => {
  const text = await hover(vimState)
  if (!text) return
  // TODO: get start column of the object (to show popup menu anchored to the beginning of the word)
  const data = await getColorData(text, vimState.filetype)
  hoverUI.show({ data, row: vimUI.cursor.row, col: vimState.column })
})

on.cursorMove(() => hoverUI.hide())
on.insertEnter(() => hoverUI.hide())
on.insertLeave(() => hoverUI.hide())

