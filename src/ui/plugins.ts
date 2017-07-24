import { sub } from './neovim-client'
const action = sub('action')

action('files', () => {
  console.log('GET FILES SON')
})

action('buffers', () => {
  console.log('get me dat bufferz')
})