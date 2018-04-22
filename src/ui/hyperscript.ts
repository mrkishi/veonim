const type = (m: string) => Object.prototype.toString.call(m).slice(8, 11).toLowerCase()
const argTypes = (args = []) => new Proxy({}, {
  get: (_, key) => args.find(a => type(a) === key)
})

const CLASS_SPLIT = /([\.#]?[a-zA-Z0-9\u007F-\uFFFF_:-]+)/
const NOT_CLASS_OR_ID = /^\.|#/

const parse = {
  selector: (selector: string) => {
    if (!selector) return {}

    const parts = selector.split(CLASS_SPLIT)
    const tag = NOT_CLASS_OR_ID.test(parts[1]) ? 'div' : (parts[1] || 'div')
    const parse = (delimit: string) => parts
      .map(p => p.charAt(0) === delimit && p.substring(1, p.length))
      .filter(p => p)
      .join(' ')

    return { tag, id: parse('#'), css: parse('.') }
  },

  css: (input: any) => type(input) === 'obj'
    ? Object.keys(input).filter(k => input[k]).join(' ')
    : [].concat(input).join(' ')
}

export default (createElement: Function) => (...a: any[]) => {
  const $ = argTypes(a as any) as any
  const props = Object.assign({}, $.obj)
  if (props.render === false) return null

  const { tag = $.fun, id, css } = parse.selector($.str) as any
  const classes = [ css, props.className, parse.css(props.css) ]
    .filter(c => c)
    .join(' ')
    .trim()

  if (id) props.id = id
  if (classes) props.className = classes

  const { str, num } = argTypes(a.slice(1) as any) as any

  const children = [ ...($.arr || []) ]
  if (str || num) children.push(str || num)

  delete props.css
  delete props.render

  return createElement(tag, props, ...children.filter(m => m))
}
