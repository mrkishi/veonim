'use strict'

const { watch, ensureDir } = require('fs-extra')
const { exec } = require('child_process')
const { spawn } = require('cross-spawn')
const path = require('path')

const cwd = path.join(__dirname, '..')
const devConfig = path.join(cwd, 'xdg_config')

ensureDir(devConfig).then(async () => {
  console.log('========================================')
  console.log('local dev XDG_CONFIG_HOME dir:', devConfig)
  console.log('----------------------------------------')
  console.log('for the purposes of development/testing pretend this is your ~/.config or XDG_CONFIG_HOME equivalent folder. in dev mode, veonim will use this folder to source configs and install extensions/plugins to')
  console.log('========================================')
})

const npmrun = task => exec(`npm run ${task}`, { cwd })
const tsc = conf => spawn('tsc', [
  '-p',
  conf,
  '--watch',
  '--preserveWatchOutput',
], { cwd })

let electronStarted = false

const startElectron = () => {
  electronStarted = true

  const proc = spawn('npx', [
    'electron',
    'build/bootstrap/main.js'
  ], {
    shell: true,
    env: {
      ...process.env,
      VEONIM_DEV: 42,
      XDG_CONFIG_HOME: devConfig,
    },
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
