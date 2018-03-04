'use strict'

const { spawn, exec } = require('child_process')
const watch = require('node-watch')
const cwd = `${__dirname}/..`
const npmrun = task => exec(`npm run ${task}`, { cwd })
const tsc = conf => spawn('tsc', [
  '-p',
  conf,
  '--watch',
  // TODO: enable this in TS 2.8.1 because TYPESCRIPT WAT R U DOIN
  // '--preserveWatchOutput',
], { cwd })

let electronStarted = false

const startElectron = () => {
  electronStarted = true

  const proc = spawn('npx', [
    'electron',
    'build/bootstrap/main.js'
  ], {
    shell: true,
    env: Object.assign({}, process.env, { VEONIM_DEV: 42 })
  })

  proc.stdout.pipe(process.stdout)
  proc.stderr.pipe(process.stderr)
}

watch(`${cwd}/src/bootstrap/index.html`, () => {
  console.log('html modified... copying...')
  npmrun('html')
})

let initialCompile = 0

tsc('tsconfig.json').stdout.on('data', m => {
  const line = m.toString()
  process.stdout.write(line)
  if (line.includes('Compilation complete')) {
    initialCompile++
    if (initialCompile > 1 && !electronStarted) startElectron()
  }
})

tsc('src/workers/tsconfig.json').stdout.on('data', m => {
  const line = m.toString()
  process.stdout.write(`WW: ${line}`)
  if (line.includes('Compilation complete')) {
    initialCompile++
    if (initialCompile > 1 && !electronStarted) startElectron()
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
