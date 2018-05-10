import { createWriteStream, ensureFile } from 'fs-extra'
import { join, sep, dirname as getDirname } from 'path'
import { Transform } from 'stream'
const unzipper = require('unzipper')
const request = require('request')

interface DownloadRequest {
  user: string,
  repo: string,
  dirname: string,
  destination: string,
}

const url = {
  github: (user: string, repo: string) => `https://github.com/${user}/${repo}/archive/master.zip`,
  vscode: (author: string, name: string, version = 'latest') => `https://${author}.gallery.vsassets.io/_apis/public/gallery/publisher/${author}/extension/${name}/${version}/assetbyname/Microsoft.VisualStudio.Services.VSIXPackage`,
}

export const downloadGithubRepo = ({ user, repo, destination: path }: DownloadRequest) => new Promise(done => {
  request(url.github(user, repo))
    .pipe(unzipper.Extract({ path }))
    .on('close', () => done({ path, success: true }))
    .on('error', (error: any) => done({ path, success: false, error }))
})

const renameFirstDir = (destination: string, path: string, dirname: string) => {
  const [ , ...restOfPath ] = path.split(sep)
  return join(destination, dirname, ...restOfPath)
}

export const downloadGithubExt = ({ user, repo, destination, dirname }: DownloadRequest) => new Promise(done => {
  request(url.github(user, repo))
    .pipe(unzipper.Parse())
    .pipe(new Transform({
      objectMode: true,
      transform: (e: any, _, done) => {
        if (e.type === 'Directory') return done()
        const dest = renameFirstDir(destination, e.path, dirname)
        ensureFile(dest).then(() => e.pipe(createWriteStream(dest)).on('finish', done)).catch(console.error)
      }
    }))
    .on('close', () => done({ path: destination, success: true }))
    .on('error', (error: any) => done({ path: destination, success: false, error }))
})

export const downloadVscodeExt = ({ user, repo, destination, dirname }: DownloadRequest) => new Promise(done => {
  request(url.vscode(user, repo))
    .pipe(unzipper.Parse())
    .pipe(new Transform({
      objectMode: true,
      transform: (e: any, _, done) => {
        if (e.type === 'Directory') return done()
        // do not download metadata files outside of extension/ folder
        if (getDirname(e.path) === '.') return done()

        const dest = renameFirstDir(destination, e.path, dirname)
        ensureFile(dest).then(() => e.pipe(createWriteStream(dest)).on('finish', done)).catch(console.error)
      }
    }))
    .on('close', () => done({ path: destination, success: true }))
    .on('error', (error: any) => done({ path: destination, success: false, error }))
})
