import { filter as fuzzy } from 'fuzzaldrin-plus'

const keywords = (() => {
  const p = (cwd: string, file: string) => `${cwd}/${file}`
  const m = new Map<string, string[]>()

  return {
    set: (cwd: string, file: string, words: string[]) => m.set(p(cwd, file), words),
    get: (cwd: string, file: string) => m.get(p(cwd, file)),
    add: (cwd: string, file: string, word: string) => {
      const e = m.get(p(cwd, file)) || []
      if (e.includes(word)) return
      m.set(p(cwd, file), (e.push(word), e))
    }
  }
})()

const harvest = (buffer: string[]) => {
  const keywords = new Set<string>()
  const totalol = buffer.length

  for (let ix = 0; ix < totalol; ix++) {
    const words = buffer[ix].match(/[A-Za-z]\w+/g) || []
    const wordsTotal = words.length

    for (let wix = 0; wix < wordsTotal; wix++) {
      const word = words[wix]
      if (word.length > 2) keywords.add(word)
    }
  }

  return [...keywords]
}

const filter = (cwd: string, file: string, query: string, max = 20): string[] =>
  fuzzy(keywords.get(cwd, file), query).slice(0, max) as string[]

onmessage = ({ data: [ e, args ] }: MessageEvent) => {
  const [ cwd, file, buffer ] = args
  const [ , , query, max ] = args

  if (e === 'set') keywords.set(cwd, file, harvest(buffer))
  else if (e === 'add') keywords.add(cwd, file, buffer)
  else if (e === 'get') postMessage(['keywords', keywords.get(cwd, file)])
  else if (e === 'filter') {
    const res = filter(cwd, file, query, max)
    postMessage(['results', res])
  }
}
