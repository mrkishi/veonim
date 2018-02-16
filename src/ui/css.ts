export interface Point {
  x: number,
  y: number,
}

// TODO: does not exist on HTMLElement (in the TS api)
export interface AnimateElement extends HTMLElement {
  animate(keyframes: object[], options?: object): Promise<void>,
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

export const translate = (x: number | string, y: number | string) => `translate(${x}px, ${y}px)`
export const cvar = (name: string) => `var(--${name})`
export const bold = (color: string) => ({ color, fontWeight: 'bold' })
export const faded = (color: string, amount: number) => ({ color: hexToRGBA(color, amount) })

export const setVar = (name: string, val: number | string) =>
  document.documentElement.style.setProperty(`--${name}`, val + '')

export const gradient = (deg: number, color1: string, fade1: number, color2: string, fade2: number) =>
  `linear-gradient(${deg}deg, ${color1} ${fade1}%, ${color2} ${fade2}%)`

export const partialFill = (direction: string, color: string, size: number) =>
  gradient(direction === 'horizontal' ? 0 : 90, color, size, 'rgba(0,0,0,0)', 0)

export const prop = (el: Element, name: string) =>
  parseFloat(window.getComputedStyle(el).getPropertyValue(name))

export const polygon = (...points: Point[]) =>
  `polygon(${points.map(p => `${percent(p.x)} ${percent(p.y)}`).join(', ')})`

export const hexToRGB = (color: string) => {
  const hex = parseInt(color.replace(/#/, ''), 16)
  return [hex >> 16, hex >> 8 & 0xFF, hex & 0xFF]
}

export const hexToRGBA = (color: string, alpha: number) => {
  if (!color) return ''
  const [ r, g, b ] = hexToRGB(color)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const rgbToHSL = (red: number, green: number, blue: number) => {
  const r = red / 255
  const g = green / 255
  const b = blue / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)

  let h: number = (max + min) / 2
  let s: number = (max + min) / 2
  let l: number = (max + min) / 2

  if (max == min) {
    h = s = 0 // achromatic
  } else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }

    h /= 6
  }

  return { hue: h, saturation: s, luminosity: l }
}

// https://stackoverflow.com/a/13542669
const shadeColor = (color: string, percent: number) => {   
  const f = parseInt(color.slice(1),16)
  const t = percent < 0 ? 0 : 255
  const p = percent < 0 ? percent * -1 : percent
  const R = f >> 16
  const G = f >> 8&0x00FF
  const B = f & 0x0000FF

  return "#" + (0x1000000
    + (Math.round((t - R) * p) + R) * 0x10000
    + (Math.round((t - G) * p) + G) * 0x100
    + (Math.round((t - B) * p) + B))
    .toString(16)
    .slice(1)
}


export const contrast = (color: string, contrastAgainst: string, amount: number) => {
  (amount)
  const [ r, g, b ] = hexToRGB(contrastAgainst)
  const { luminosity } = rgbToHSL(r, g, b)
  const lum = Math.floor(luminosity * 100)
  const shouldDarken = lum < 50
  return shadeColor(color, shouldDarken ? -(amount / 100) : ((amount - 10) / 100))
}

export const brighten = (color: string, amount: number) => shadeColor(color, (amount / 100))
export const darken = (color: string, amount: number) => shadeColor(color, -(amount / 100))

// chrome does not support .finished property on animate()
export const animate = (element: HTMLElement, keyframes: object[], options = {} as any): Promise<void> => {
  if (options.duration) {
    (element as AnimateElement).animate(keyframes, options)
    return new Promise(fin => setTimeout(fin, options.duration - 25))
  }

  (element as AnimateElement).animate(keyframes, options)
  return Promise.resolve()
}
