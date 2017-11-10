import { action, current, on } from '../ui/neovim'
import { getColorData } from '../color-service'
import * as hoverUI from '../ui/plugins/hover'
import { hover } from '../langserv/adapter'
import vimUI from '../ui/canvasgrid'
import { fileInfo } from '../ai'

action('hover', async () => {
  const text = await hover({ ...fileInfo() })
  if (!text) return
  // TODO: get start column of the object (to show popup menu anchored to the beginning of the word)
  const data = await getColorData(text, current.filetype)
  hoverUI.show({ data, row: vimUI.cursor.row, col: current.column })
})

on.cursorMove(() => hoverUI.hide())
on.insertEnter(() => hoverUI.hide())
on.insertLeave(() => hoverUI.hide())

