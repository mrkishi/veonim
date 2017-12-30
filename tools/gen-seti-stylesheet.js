const { iconDefinitions } = require('../src/assets/seti-icon-theme.json')
const { basename, extname, join } = require('path')
const { createWriteStream } = require('fs')

const out = createWriteStream(join(__dirname, '../src/assets/seti-icons.css'))
const leftPad = (str, amt) => Array(amt).fill(' ').join('') + str
const write = (m = '', pad = 0) => out.write(leftPad(`${m}\n`, pad))

const ids = Object.keys(iconDefinitions).map(key => ({
  id: key,
  content: iconDefinitions[key].fontCharacter,
  color: iconDefinitions[key].fontColor,
}))

if (!ids || !ids.length) {
  console.log('found no icon definitions. nothing to do here *jetpack*')
  process.exit(0)
} else {
  console.log(`found ${ids.length} icon definitions`)
}

console.log('writing stylesheet css file')

write(`@font-face {
  font-family: 'seti-icons';
  src: url('../assets/seti.ttf');
}\n`)

write(`.seti-icon {
  font-family: 'seti-icons';
  font-size: 150%;
}\n`)

console.log('writing icon styles...')

ids.map(({ id, content, color }) => write(`.seti-icon.${id}::before { content: '${content}';${ color ? ` color: ${color};` : '' } }`))

console.log(`wrote ${ids.length} icon definitions`)
