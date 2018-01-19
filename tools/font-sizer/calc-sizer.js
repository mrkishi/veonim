const { remote } = require('electron')
const { join } = require('path')
const { createWriteStream } = require('fs')
const out = createWriteStream(join(__dirname, '../../src/assets/roboto-sizes.json'))
const leftPad = (str, amt) => Array(amt).fill(' ').join('') + str
const write = (m = '', pad = 0) => out.write(leftPad(`${m}\n`, pad))

console.log('waiting for fonts')

const canvasEl = document.getElementById('canvas')
const canvas = canvasEl.getContext('2d', { alpha: false })

const fontSizer = face => size => {
  canvas.font = `${size}px ${face}`
  return canvas.measureText('m').width
}


const main = () => {
  console.log('fonts loaded k thx')
  const getWidth = fontSizer('Roboto Mono')

  const points = [...Array(50)].map((_, ix) => ix + 4)
  const widths = points.map(p => ({ size: p, width: getWidth(p) }))

  write('{')
  widths.forEach(m => write(`"${m.size}": "${m.width}",`, 2))
  write('{')

  console.log('wrote the sizes, done here!')
}

document.fonts.onloadingdone = main
