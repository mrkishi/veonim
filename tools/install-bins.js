#! /usr/bin/env node
const { $, go, run, fromRoot } = require('./runner')
const fs = require('fs-extra')
const pkgPath = fromRoot('package.json')
const pkg = require(pkgPath)

const os = process.platform
const deps = Reflect.get(pkg, `bindeps-${os}`)

require.main === module && go(async () => {
  if (!deps) return
  $`installing binary dependencies`

  for (const [ dependency, version ] of Object.entries(deps)) {
    await run(`npm i ${dependency}@${version}`)
  }

  const pkgData = JSON.stringify(pkg, null, 2)
  await fs.writeFile(pkgPath, pkgData)

  $`done installing binary dependencies`
})

module.exports = { deps }
