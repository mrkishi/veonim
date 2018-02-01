import { createWriteStream } from 'fs'
import { createGunzip } from 'zlib'
import * as https from 'https'

const request = (url: string): Promise<NodeJS.ReadableStream> =>
  new Promise(fin => https.get(url, fin))

export const download = (url: string, destination: string) => new Promise(async done => {
  const downloadStream = await request(url)
  const writeStream = createWriteStream(destination)
  const unzipper = createGunzip()

  downloadStream
    .pipe(unzipper)
    .pipe(writeStream)
    .on('finish', () => done({ url, destination }))
})

export const downloadRepo = (user: string, repo: string, destination: string) => 
  download(`https://github.com/${user}/${repo}/tarball/master`, destination)
