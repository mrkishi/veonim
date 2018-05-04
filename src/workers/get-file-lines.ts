import { NewlineSplitter, exists } from '../support/utils'
import WorkerClient from '../messaging/worker-client'
import { createReadStream } from 'fs'

interface LineContents {
  ix: number,
  line: string,
}

const fileReader = (path: string, targetLines: number[]) => new Promise(done => {
  const collectedLines: LineContents[] = []
  const linesOfInterest = new Set(targetLines)
  const maxLineIndex = Math.max(...targetLines)
  let currentLineIndex = 0

  const readStream = createReadStream(path)
    .pipe(new NewlineSplitter())
    .on('data', (line: string) => {
      const needThisLine = linesOfInterest.has(currentLineIndex)
      if (needThisLine) collectedLines.push({ ix: currentLineIndex, line })

      const reachedMaximumLine = currentLineIndex === maxLineIndex
      if (reachedMaximumLine) readStream.end()

      currentLineIndex++
    })
    .on('end', () => done(collectedLines))
})

const { on } = WorkerClient()

on.getLines(async (path: string, lines: number[]) => {
  const fileExists = await exists(path)

  // at the time of this writing, the only consumer of this piece of code is
  // find-references from the lang servers. the find references will return a
  // list of path locations. we want to get the text corresponding to those
  // path locations. i think it is extremely unlikely that we would get paths
  // from find-references and then the file goes missing from the FS (file
  // system).  also, i assume that lang server would only return valid paths
  // that exist on the FS...
  //
  // although, i suppose there could be active buffers in the workspace that
  // have not been committed to the FS. and in the future lang servers might
  // support buffers that never exist on the FS (see new VSCode extensions for
  // in-memory files, etc.)
  if (!fileExists) {
    console.warn(`tried to read lines from ${path} that does not exist`)
    return []
  }

  const res =  fileReader(path, lines)
  console.log('res:', res)
  return res
})
