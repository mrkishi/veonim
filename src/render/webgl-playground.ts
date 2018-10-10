import * as fontTextureAtlas from '../render/font-texture-atlas'

const container = document.createElement('div')

Object.assign(container.style, {
  position: 'absolute',
  width: '100%',
  height: '100%',
})

const { element } = fontTextureAtlas.generateStandardSet()
container.appendChild(element)

document.body.appendChild(container)
