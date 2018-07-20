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
export const rgba = (red: number, green: number, blue: number, alpha: number) => `rgba(${red}, ${green}, ${blue}, ${alpha})`

export const setVar = (name: string, val: number | string) =>
  document.documentElement.style.setProperty(`--${name}`, val + '')

const gradient = (deg: number, color1: string, fade1: number, color2: string, fade2: number) =>
  `linear-gradient(${deg}deg, ${color1} ${fade1}%, ${color2} ${fade2}%)`

export const partialFill = (direction: string, color: string, size: number) =>
  gradient(direction === 'horizontal' ? 0 : 90, color, size, 'rgba(0,0,0,0)', 0)

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

export const hslToHex = (hue: number, saturation: number, lightness: number) => {
  const h = hue / 360
  const s = saturation / 360
  const l = lightness / 360
  let r, g, b
  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: any, q: any, t: any) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }
  const toHex = (x: any) => {
    const hex = Math.round(x * 255).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
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
export const animate = (element: HTMLElement, keyframes: AnimationKeyFrame[], options = {} as any): Promise<void> => {
  if (options.duration) {
    element.animate(keyframes, options)
    return new Promise(fin => setTimeout(fin, options.duration - 25))
  }

  element.animate(keyframes, options)
  return Promise.resolve()
}
