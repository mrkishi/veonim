const io = new Worker(`${__dirname}/../../workers/harvester.js`)
let onKeywordsCb = (_a: any) => {}

io.onmessage = ({ data: [e, arg] }: MessageEvent) => {
  if (e === 'keywords') onKeywordsCb(arg)
}

export const addWord = (cwd: string, file: string, word: string) => io.postMessage(['add', [cwd, file, word]])
export const update = (cwd: string, file: string, buffer: string[]) => io.postMessage(['set', [cwd, file, buffer]])
export const getKeywords = (cwd: string, file: string): Promise<string[]> => {
  io.postMessage(['get', [cwd, file]])
  return new Promise(fin => onKeywordsCb = fin)
}
