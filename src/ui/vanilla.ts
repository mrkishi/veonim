import { is, merge } from '../support/utils'

type EL1 = (tagName: string, style: object) => HTMLElement
type EL2 = (style: object) => HTMLElement

// TODO: what about a hyperscript to dom lib? that might be nice. you know for sciene.
export const makel: EL1 & EL2 = (...args: any[]) => {
  const styleObject = args.find(is.object)

  const el = document.createElement(args.find(is.string) || 'div')
  styleObject && merge(el.style, styleObject)

  return el
}
