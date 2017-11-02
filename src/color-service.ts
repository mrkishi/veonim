const removeMarkdown = require('remove-markdown')
import { Task, CreateTask } from './utils'

const io = new Worker(`${__dirname}/workers/neovim-colorizer.js`)

let pendingTask: Task<ColorData[][]> = {
  done: _ => {},
  promise: Promise.resolve([[]])
}

io.onmessage = ({ data: [kind, data] }: MessageEvent) => {
  if (kind === 'colorized') pendingTask.done(data)
}

export interface ColorData {
  color: string,
  text: string,
}

export const getColorData = (data: string, filetype: string): Promise<ColorData[][]>=> {
  const cleanData = removeMarkdown(data)
  pendingTask = CreateTask<ColorData[][]>()
  io.postMessage(['colorize', [ cleanData, filetype ]])
  return pendingTask.promise
}

export const setColorScheme = (scheme: string): void => io.postMessage(['set-colorscheme', scheme])
