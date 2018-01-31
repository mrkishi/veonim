import { createWriteStream } from 'fs'
import { createGunzip } from 'zlib'
import * as http from 'http'

const request = (url: string): Promise<NodeJS.ReadableStream> =>
  new Promise(fin => http.get(url, fin))

export const download = (url: string, destination: string) => new Promise(async done => {
  const downloadStream = await request(url)
  const writeStream = createWriteStream(destination)
  const unzipper = createGunzip()

  downloadStream
    .pipe(unzipper)
    .pipe(writeStream)
    .on('close', () => done({ url, destination }))
})

export const downloadRepo = (user: string, repo: string, destination: string) => 
  download(`https://github.com/${user}/${repo}/tarball/master`, destination)
