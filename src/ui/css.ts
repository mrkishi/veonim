export const gradient = (deg: number, color1: string, fade1: number, color2: string, fade2: number) => `linear-gradient(${deg}deg, ${color1} ${fade1}%, ${color2} ${fade2}%)`
export const partialFill = (direction: string, color: string, size: number) =>
  gradient(direction === 'horizontal' ? 0 : 90, color, size, 'rgba(0,0,0,0)', 0)
export const translate = (x: number, y: number) => `translate(${x}px, ${y}px)`
export const setVar = (name: string, val: number | string) => document.body.style.setProperty(`--${name}`, val + '')
export const prop = (el: Element, name: string) => parseFloat(window.getComputedStyle(el).getPropertyValue(name))