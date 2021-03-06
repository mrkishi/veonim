'use strict'

const { spawn } = require('child_process')
const { join } = require('path')

const root = join(__dirname, '..')
const fromRoot = (...paths) => join(root, ...paths)

const run = (cmd, opts = {}) => new Promise(done => {
  console.log(cmd)

  const proc = spawn('npx', cmd.split(' '), { ...opts, cwd: root, shell: true })
  const exit = () => (proc.kill(), process.exit())

  process.on('SIGBREAK', exit)
  process.on('SIGTERM', exit)
  process.on('SIGHUP', exit)
  process.on('SIGINT', exit)

  proc.stdout.pipe(process.stdout)
  proc.stderr.pipe(process.stderr)
  proc.on('exit', done)

  if (opts.outputMatch) proc.stdout.on('data', data => {
    const outputHas = data
      .toString()
      .toLowerCase()
      .includes(opts.outputMatch)

    if (outputHas && typeof opts.onOutputMatch === 'function') opts.onOutputMatch()
  })
})

const $ = (s, ...v) => Array.isArray(s) ? console.log(s.map((s, ix) => s + (v[ix] || '')).join('')) : console.log(s)
const go = fn => fn().catch(e => (console.error(e), process.exit(1)))
const createTask = () => ( (done = () => {}, promise = new Promise(m => done = m)) => ({ done, promise }) )()

const fetch = (url, options = { method: 'GET' }) => new Promise((done, fail) => {
  const { data, ...requestOptions } = options
  const opts = { ...require('url').parse(url), ...requestOptions }

  const { request } = url.startsWith('https://')
    ? require('https')
    : require('http')

  const req = request(opts, res => done(res.statusCode >= 300 && res.statusCode < 400
    ? fetchStream(res.headers.location, options)
    : res))

  req.on('error', fail)
  if (data) req.write(data)
  req.end()
})

module.exports = { $, go, run, root, fromRoot, createTask, fetch }
