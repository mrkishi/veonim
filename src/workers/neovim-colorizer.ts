import { is, prefixWith, onFnCall, pascalCase } from '../utils'
import CreateTransport from '../transport'
import NeovimUtils from '../neovim-utils'
import { Api, Prefixes } from '../api'
import Neovim from '@veonim/neovim'
import SetupRPC from '../rpc'

interface ColorData {
  color: string,
  text: string,
}

const prefix = { core: prefixWith(Prefixes.Core) }
const vimOptions = {
  rgb: true,
  ext_popupmenu: false,
  ext_tabline: false,
  ext_wildmenu: false,
  ext_cmdline: false
}

const asVimFunc = (name: string, fn: string) => {
  const expr = fn
    .split('\n')
    .filter(m => m)
    .join('\\n')
    .replace(/"/g, '\\"')

  return `exe ":fun! ${pascalCase(name)}(...) range\n${expr}\nendfun"`
}

const { encoder, decoder } = CreateTransport()
const proc = Neovim([
  '--cmd', `let g:veonim = 1 | let g:vn_loaded = 0 | let g:vn_ask_cd = 0`,
  '--cmd', `exe ":fun! Veonim(...)\\n endfun"`,
  '--cmd', `exe ":fun! VK(...)\\n endfun"`,
  '--cmd', `com! -nargs=+ -range Veonim 1`,
  '--cmd', 'com! -nargs=* Plug 1',
  '--embed',
])

proc.on('error', e => console.error('vim colorizer err', e))
proc.stdout.on('error', e => console.error('vim colorizer stdout err', e))
proc.stdin.on('error', e => console.error('vim colorizer stdin err', e))
proc.stderr.on('data', e => console.error('vim colorizer stderr', e))
proc.on('exit', () => console.error('vim colorizer exit'))

encoder.pipe(proc.stdin)
proc.stdout.pipe(decoder)

const { notify, request, onData } = SetupRPC(encoder.write)
decoder.on('data', ([type, ...d]: [number, any]) => onData(type, d))

const req: Api = onFnCall((name: string, args: any[] = []) => request(prefix.core(name), args))
const api: Api = onFnCall((name: string, args: any[]) => notify(prefix.core(name), args))

const { unblock } = NeovimUtils({ api, req })

unblock().then(errors => {
  if (errors.length) {
    console.error(`vim colorizer had some errors starting up`)
    errors.forEach(e => console.error(e))
  }

  // TODO: if plugins are not installed, defer loading colorizer.
  // figure out a way to wait for main neovim instance to finish
  // installing plugins (aka downloading packages)

  api.uiAttach(100, 10, vimOptions)
})

api.command(asVimFunc('Colorize', `
  execute 'set filetype=' . a:1

  let lineColors = []
  let lines = getline(1, '$')
  let lineCount = len(lines)
  let lineIx = 0

  while lineIx < lineCount
    let line = lines[lineIx]
    let colors = []
    let chars = split(line, '\\\\zs')
    let strLen = len(chars)
    let col = 1

    while col <= strLen
      let clr = synIDattr(synIDtrans(synID(lineIx + 1, col, 1)), 'fg#')
      call add(colors, [col, clr])
      let col += 1
    endwhile

    call add(lineColors, colors)
    let lineIx += 1
  endwhile

  return lineColors
`))

const insertIntoBuffer = (lines: string[]) => {
  api.command(`bd!`)
  api.callFunction('append', [0, lines])
}

type Color = [number, string]
const getTextColors = (filetype = ''): Promise<Color[][]> => req.callFunction('Colorize', [filetype])

type ColorRange = [number, number, string]
const colorsAsRanges = (colors: Color[][]): ColorRange[][] => colors.map(line => line.reduce((grp, [col, color]) => {
  if (col === 1) return (grp.push([0, col, color]), grp)

  const prev = grp[grp.length - 1]
  if (prev[2] === color) prev[1] = col
  else grp.push([col - 1, col, color])

  return grp
}, [] as ColorRange[]))

const colorData = (lines: string[], ranges: ColorRange[][]): ColorData[][] => ranges.map((line, ix) => line
  .map(([ s, e, color ]) => ({
    color,
    text: lines[ix].slice(s, e),
  })))

// TODO: probably need some mechanism to queue requests and do them serially.
// don't want to override vim buffer while another req is processing
const colorizeText = async (text: string, filetype = ''): Promise<ColorData[][]> => {
  const lines = text.split('\n')
  insertIntoBuffer(lines)

  const colors = await getTextColors(filetype) || []
  return colorData(lines, colorsAsRanges(colors))
}

const setColorScheme = (scheme: string) => api.command(`colorscheme ${scheme}`)

onmessage = ({ data }: MessageEvent) => {
  if (!is.array(data)) return
  const [ method, args ] = data

  if (method === 'colorize' && is.array(args)) {
    const [ text, filetype ] = args
    colorizeText(text, filetype).then(res => postMessage([ 'colorized', res ]))
  }

  else if (method === 'set-colorscheme') setColorScheme(args)
}
