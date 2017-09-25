const path = require('path')
const fs = require('fs')

const read = dir => fs.readdirSync(dir).reduce((files, file) => fs.statSync(path.join(dir, file)).isDirectory() 
  ? files.concat(read(path.join(dir, file))) 
  : files.concat(path.join(dir, file)), [])

exports.default = module.exports = read
