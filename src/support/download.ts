const unzipper = require('unzipper')
const request = require('request')

export const download = (url: string, path: string) => new Promise(done => {
  request(url)
    .pipe(unzipper.Extract({ path }))
    .on('close', () => done({ url, path, success: true }))
    .on('error', (error: any) => done({ url, path, success: false, error }))
})

export const downloadRepo = (user: string, repo: string, destination: string) =>
  download(`https://github.com/${user}/${repo}/archive/master.zip`, destination)
