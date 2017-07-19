const cursorArgs = ['hor', 'ver', 'block', 'blinkwait', 'blinkon', 'blinkoff']

enum CursorArgType { horizontal, vertical, block, color }
interface CursorArg {
  type: CursorArgType,
  val?: string
}

const getCursorSize = (a: string) => {
  const res = a.match(/(?:hor|ver)(\d{0,2})/)
  if (res && res.length) return res[1]
}

export const parse = (opts: string) => opts
  .split(',')
  .map(o => {
    const [ modes, args ] = o.split(':')
    return { modes: modes.split('-'), args: args.split('-') }
  })
  .map(({ modes, args }) => {
    const mappedArgs = args.map((a: string): CursorArg | undefined => {
      if (a.startsWith('hor')) return { type: CursorArgType.horizontal, val: getCursorSize(a) }
      if (a.startsWith('ver')) return { type: CursorArgType.vertical, val: getCursorSize(a) }
      if (a === 'block') return { type: CursorArgType.block }
      if (!cursorArgs.includes(a)) return { type: CursorArgType.color, val: a }
    }).filter(a => a && a.type) as CursorArg[]

    return { modes, args: mappedArgs }
  })
  .reduce((map, { modes, args }) => {
    modes.forEach(mode => map.has(mode)
      ? map.get(mode)!.concat(args)
      : map.set(mode, args))
    return map
  }, new Map<string, CursorArg[]>())