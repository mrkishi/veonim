import WorkerClient from '../messaging/worker-client'
import { ensureDir, remove } from '../support/utils'
import { Archiver } from '../support/binaries'
import { fetchStream } from '../support/fetch'
import { createWriteStream } from 'fs'
// not using node built-in http lib because we need error handling and
// redirects (in the case of github). tried using built-in fetch api, but
// the stream interface does not seem to be compatible with node's stream api

const { on } = WorkerClient()

const downloadZip = (url: string, path: string) => new Promise(async done => {
  const downloadStream = await fetchStream(url)
  const fileStream = createWriteStream(`${path}.zip`)

  downloadStream
    .pipe(fileStream)
    .on('close', done)
    .on('error', done)
})

const unzip = (path: string) => new Promise(done => Archiver(['open', `${path}.zip`, path])
  .on('exit', done)
  .on('error', done))

on.download(async (url: string, path: string) => {
  await ensureDir(path)

  const downloadErr = await downloadZip(url, path).catch(console.error)
  if (downloadErr) {
    console.error(downloadErr)
    return false
  }

  const unzipErr = await unzip(path).catch(console.error)
  if (unzipErr) console.error(unzipErr)

  await remove(`${path}.zip`).catch(console.error)
  return !unzipErr
})
