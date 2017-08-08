const keywords: string[] = []

export const update = {
  buffer: (buffer: string[]) => {
    console.log('buffer', buffer)
    keywords.push(...buffer)
  },
  line: (line: string) => {
    console.log('line', line)
    keywords.push(line)
  }
}
