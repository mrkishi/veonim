import * as fontTextureAtlas from '../render/font-texture-atlas'

const container = document.createElement('div')

Object.assign(container.style, {
  top: '50px',
  position: 'absolute',
  width: '100%',
  height: '100%',
})

const { element } = fontTextureAtlas.generateStandardSet()
element.style.border = '1px solid yellow'
container.appendChild(element)

document.body.appendChild(container)
