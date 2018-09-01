import { current } from '../core/neovim'
import Worker from '../messaging/worker'
import vimState from '../neovim/state'

interface LineContents {
  ix: number,
  line: string,
}

const worker = Worker('get-file-lines')
const isCurrentBuffer = (path: string) => path === vimState.absoluteFilepath

const getFromCurrentBuffer = async (lines: number[]) => {
  const buffer = current.buffer
  const getLineRequests = lines.map(async ix => ({
    ix,
    line: await buffer.getLine(ix),
  }))

  return Promise.all(getLineRequests)
}

export const getLines = (path: string, lines: number[]): Promise<LineContents[]> => isCurrentBuffer(path)
  ? getFromCurrentBuffer(lines)
  : worker.request.getLines(path, lines)
