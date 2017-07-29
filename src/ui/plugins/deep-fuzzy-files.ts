const io = new Worker(`${__dirname}/../../workers/fs-fuzzy.js`)

let onResultsCb = function (_arr: string[]) {}
let initialDone = function (_arr: string[]) {}
let onDone = function () {}

io.onmessage = ({ data: [e, arg] }: MessageEvent) => {
  if (e === 'results') onResultsCb(arg)
  else if (e === 'done') onDone()
  else if (e === 'initial') arg && arg.length && initialDone(arg)
}

export const load = (cwd: string) => io.postMessage(['load', cwd])
export const cancel = () => io.postMessage(['stop'])
export const onResults = (fn: (arr: string[]) => void) => onResultsCb = fn
export const whenDone = (fn: () => void) => onDone = fn
export const query = (query: string) => io.postMessage(['query', query])
export const getInitial = () => new Promise(done => initialDone = done)