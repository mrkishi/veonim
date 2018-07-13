import colorizer, { ColorData } from '../services/colorizer'
import { action, current as vim, on } from '../core/neovim'
import { supports } from '../langserv/server-features'
import * as markdown from '../support/markdown'
import { hover } from '../langserv/adapter'
import { ui } from '../components/hover'

const textByWord = (data: ColorData[]): ColorData[] => data.reduce((res, item) => {
  const words = item.text.split(/(\s+)/)
  const items = words.map(m => ({ color: item.color, text: m }))
  return [...res, ...items]
}, [] as ColorData[])

action('hover', async () => {
  if (!supports.hover(vim.cwd, vim.filetype)) return

  const { value, doc } = await hover(vim)
  if (!value) return

  const cleanData = markdown.remove(value)
  const coloredLines: ColorData[][] = await colorizer.request.colorize(cleanData, vim.filetype)
  const data = coloredLines
    .map(m => textByWord(m))
    .map(m => m.filter(m => m.text.length))

  ui.show({ data, doc })
})

on.cursorMove(ui.hide)
on.insertEnter(ui.hide)
on.insertLeave(ui.hide)
