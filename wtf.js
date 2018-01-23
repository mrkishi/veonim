'use strict'

const { NewlineSplitter } = require('./build/support/utils')
const { spawn, exec } = require('child_process')

const compiler = spawn('npm', ['run', 'watch'])
//const idiots = spawn('/Users/a/go/bin/errorformat', ['-name=tsc'])

const fuckingmorons = line => exec(`echo '${line}' | /Users/a/go/bin/errorformat -name=tsc`, (err, out, ser) => {
  if (err) throw err
  console.log('@', JSON.stringify(out))
})

compiler.stdout.pipe(new NewlineSplitter()).on('data', line => {
  fuckingmorons(line)
  //if (line.includes(': error TS')) {
    //compiler.stdin.write(line)
    //console.log('>', line)
  //}
})
