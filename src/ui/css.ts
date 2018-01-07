export interface Point {
  x: number,
  y: number,
}

const percent = (integer: number) => `${integer * 100}%`

export const paddingVH = (vertical: number, horizontal: number) => ({
  paddingLeft: `${vertical}px`,
  paddingRight: `${vertical}px`,
  paddingTop: `${horizontal}px`,
  paddingBottom: `${horizontal}px`,
})

export const paddingH = (amount: number) => ({
  paddingTop: `${amount}px`,
  paddingBottom: `${amount}px`,
})

export const paddingV = (amount: number) => ({
  paddingLeft: `${amount}px`,
  paddingRight: `${amount}px`,
})

export const gradient = (deg: number, color1: string, fade1: number, color2: string, fade2: number) => `linear-gradient(${deg}deg, ${color1} ${fade1}%, ${color2} ${fade2}%)`
export const partialFill = (direction: string, color: string, size: number) =>
  gradient(direction === 'horizontal' ? 0 : 90, color, size, 'rgba(0,0,0,0)', 0)
export const translate = (x: number | string, y: number | string) => `translate(${x}px, ${y}px)`
export const setVar = (name: string, val: number | string) => document.body.style.setProperty(`--${name}`, val + '')
export const prop = (el: Element, name: string) => parseFloat(window.getComputedStyle(el).getPropertyValue(name))
export const bold = (color: string) => ({ color, 'font-weight': 'bold' })
export const faded = (color: string, amount: number) => ({ color: hexToRGBA(color, amount) })
export const polygon = (...points: Point[]) => `polygon(${points.map(p => `${percent(p.x)} ${percent(p.y)}`).join(', ')})`

export const hexToRGB = (color: string) => {
  const hex = parseInt(color.replace(/#/, ''), 16)
  return [hex >> 16, hex >> 8 & 0xFF, hex & 0xFF]
}

export const hexToRGBA = (color: string, alpha: number) => {
  if (!color) return ''
  const [ r, g, b ] = hexToRGB(color)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
