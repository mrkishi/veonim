'use strict'

const { spawn } = require('child_process')
const proc = spawn('npx', [
  'electron',
  'build/bootstrap/main.js'
], {
  shell: true,
  env: Object.assign({}, process.env, { VEONIM_DEV: 42 })
})

proc.stdout.pipe(process.stdout)
proc.stderr.pipe(process.stderr)
