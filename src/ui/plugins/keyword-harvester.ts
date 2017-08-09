const keywords = (() => {
  const p = (cwd: string, file: string) => `${cwd}/${file}`
  const m = new Map<string, string[]>()

  return {
    set: (cwd: string, file: string, words: string[]) => m.set(p(cwd, file), words),
    get: (cwd: string, file: string) => m.get(p(cwd, file)),
    add: (cwd: string, file: string, words: string[]) => {
      const e = m.get(p(cwd, file)) || []
      m.set(p(cwd, file), [...e, ...words])
    }
  }
})()

const harvest = (buffer: string[]) => {
  const keywords = new Set<string>()

  for (let ix = 0; ix < buffer.length; ix++) {
    // TODO: make less restrictive. this doesnt even cover valid JS identifiers
    // (although valid identifiers will be collected from AST)
    const words = buffer[ix].match(/[A-Za-z]\w+/g) || []
    const wordsTotal = words.length

    for (let wix = 0; wix < wordsTotal; wix++) {
      const word = words[wix]
      if (word.length > 2) keywords.add(word)
    }
  }

  return [...keywords]
}

export const getKeywords = (cwd: string, file: string) => keywords.get(cwd, file)

export const update = (cwd: string, file: string, buffer: string[]) => {
  keywords.set(cwd, file, harvest(buffer))
}
