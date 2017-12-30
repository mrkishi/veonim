'use strict'

const { spawn, exec } = require('child_process')
const watch = require('node-watch')
const cwd = `${__dirname}/..`
const npmrun = task => exec(`npm run ${task}`, { cwd })
const tsc = conf => spawn('tsc', ['-p', conf, '--watch'], { cwd })

watch(`${cwd}/src/bootstrap/index.html`, () => {
  console.log('html modified... copying...')
  npmrun('html')
})

tsc('tsconfig.json').stdout.pipe(process.stdout)
tsc('tsconfig.workers.json').stdout.on('data', m => {
  const line = m.toString()
  process.stdout.write(`WW: ${line}`)
  if (line.includes('Compilation complete')) {
    console.log('cleaning up exports in web workers...')
    npmrun('fixexp')
  }
})

setTimeout(() => {
  console.log('copying runtime files')
  npmrun('runtime')
  console.log('copying html')
  npmrun('html')
  console.log('copying assets')
  npmrun('assets')
}, 2e3)
