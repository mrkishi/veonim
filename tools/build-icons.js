'use strict'

const { getDirFiles, readFile, writeFile } = require('../build/support/utils')
const babel = require('babel-core')
const j = require('jscodeshift')
const path = require('path')

const theplace = path.join(__dirname, '../node_modules/feather-icons/dist/icons')

const doeet = async thing => {
  const data = await readFile(thing.path)
  console.log('processing', thing.name)
  const { ast } = babel.transform(data, { plugins: ['transform-react-jsx'] })
  const args = ast.program.body[0].expression.arguments.slice(2)
  const mods = j(args).toSource({ quote: 'single', trailingComma: true })
  const stuff = Array.isArray(mods) ? mods : [ mods ]
  const children = stuff
    .map(m => m.replace(/React.createElement/g, 'h'))
    .join(',\n')

  const res = `import { h } from '../ui/uikit'

export default ({ size = 24, color = 'currentColor', weight = 2 }) => h('svg', {
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: color,
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
  'stroke-width': weight + '',
}, [
${children}
])`

  const destpath = path.join(__dirname, '../src/icons/', thing.name.replace('svg', 'ts'))
  await writeFile(destpath, res)
  console.log('saved', destpath)
}

void async function () {
  const iconPaths = (await getDirFiles(theplace)).filter(m => m.file)
  await Promise.all(iconPaths.map(doeet))
}()
