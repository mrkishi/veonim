import Worker from '../messaging/worker'

export interface ColorData {
  color: string,
  text: string,
}

export default Worker('neovim-colorizer')
