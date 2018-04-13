const unzipper = require('unzipper')
const request = require('request')

interface ZipRequestFromGithub {
  user: string,
  repo: string,
  destination: string,
}

interface ZipRequest {
  url: string,
  destination: string,
}

export type DownloadZipRequest = ZipRequest | ZipRequestFromGithub

const downloadZip = (url: string, path: string) => new Promise(done => {
  request(url)
    .pipe(unzipper.Extract({ path }))
    .on('close', () => done({ url, path, success: true }))
    .on('error', (error: any) => done({ url, path, success: false, error }))
})

const downloadGithub = ({ user, repo, destination }: ZipRequestFromGithub) => {
  return downloadZip(`https://github.com/${user}/${repo}/archive/master.zip`, destination)
}

const downloadUrl = ({ url, destination }: ZipRequest) => downloadZip(url, destination)

export const downloadRepo = (req: DownloadZipRequest) => (req as ZipRequest).url
  ? downloadUrl(req as ZipRequest)
  : downloadGithub(req as ZipRequestFromGithub)
