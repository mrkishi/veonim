import { action, current as vimState, on } from '../core/neovim'
import * as markdown from '../support/markdown'
import { hover } from '../langserv/adapter'
import { ui } from '../components/hover'
import Worker from '../messaging/worker'

export interface ColorData {
  color: string,
  text: string,
}

export const colorizer = Worker('neovim-colorizer')

const textByWord = (data: ColorData[]): ColorData[] => data.reduce((res, item) => {
  const words = item.text.split(/(\s+)/)
  const items = words.map(m => ({ color: item.color, text: m }))
  return [...res, ...items]
}, [] as ColorData[])

action('hover', async () => {
  const { value, doc } = await hover(vimState)
  if (!value) return
  const cleanData = markdown.remove(value)
  const coloredLines: ColorData[][] = await colorizer.request.colorize(cleanData, vimState.filetype)
  const data = coloredLines
    .map(m => textByWord(m))
    .map(m => m.filter(m => m.text.length))

  ui.show({ data, doc })
})

on.cursorMove(ui.hide)
on.insertEnter(ui.hide)
on.insertLeave(ui.hide)
