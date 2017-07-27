import { translate } from '../css'

const el = document.getElementById('gui-cursor') as HTMLElement
const style = el.style

interface GUICursor {
  show(): GUICursor,
  hide(): GUICursor,
  moveTo(x: number, y: number): GUICursor,
  width(): number
}

const api = {} as GUICursor

api.show = () => (style.display = 'block', api)
api.hide = () => (style.display = 'none', api)
api.moveTo = (x, y) => (style.transform = translate(x, y), api)
api.width = () => el.getBoundingClientRect().width

export default api