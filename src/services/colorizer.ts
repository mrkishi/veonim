import Worker from '../messaging/worker'

export interface ColorData {
  color: string,
  text: string,
  highlight?: boolean,
}

export default Worker('neovim-colorizer')
