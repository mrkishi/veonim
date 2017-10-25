import { CreateTask } from '../../utils'

const io = new Worker(`${__dirname}/../../workers/harvester.js`)
const tasks = {
  keyword: CreateTask<string[]>(),
  filter: CreateTask<string[]>(),
}

io.onmessage = ({ data: [e, arg] }: MessageEvent) => {
  if (e === 'keywords') return tasks.keyword.done(arg)
  if (e === 'results') return tasks.filter.done(arg)
}

export const addWord = (cwd: string, file: string, word: string) => io.postMessage(['add', [cwd, file, word]])
export const update = (cwd: string, file: string, buffer: string[]) => io.postMessage(['set', [cwd, file, buffer]])
export const getKeywords = (cwd: string, file: string): Promise<string[]> => {
  io.postMessage(['get', [cwd, file]])
  tasks.keyword = CreateTask<string[]>()
  return tasks.keyword.promise
}

export const queryKeywords = (cwd: string, file: string, query: string, max = 20): Promise<string[]> => {
  io.postMessage(['filter'], [cwd, file, query, max])
  tasks.filter = CreateTask<string[]>()
  return tasks.filter.promise
}
