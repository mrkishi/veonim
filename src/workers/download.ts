import { createWriteStream, ensureDir, remove } from 'fs-extra'
import WorkerClient from '../messaging/worker-client'
import Archiver from 'all-other-unzip-libs-suck'
const request = require('request')
// TODO: why can't we use built-in request http module for download?

const { on } = WorkerClient()

const downloadZip = (url: string, path: string) => new Promise(done => request(url)
  .pipe(createWriteStream(`${path}.zip`))
  .on('close', done)
  .on('error', done))

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
