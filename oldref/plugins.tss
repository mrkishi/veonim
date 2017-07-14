import { log } from './logger'
import getProjectFiles from './files'
import { VimBuffer } from './functions'
import { basename, dirname } from 'path'
import { onFnCall, pascalCase } from './utils'
import { call, cmd, action } from './neovim'

interface SearchEntry {
  name: string,
  base: string,
  modified?: boolean,
  dir: string
}

const cc = (...a: any[]) => Promise.all(a)
const formatDir = (dir: string) => dir === '.' ? '' : `${dir}/`
const cleanup = (fullpath: string, cwd: string) => fullpath.includes(cwd)
  ? fullpath.split(cwd + '/')[1]
  : fullpath

//call -> call
//ex -> command
//expr -> commandOutput? ex cmd and output
//expr -> eval
//normal -> ??

const derp = (e: string) => {
  log `${e}`
  return []
}

const cache: { files: SearchEntry[], buffers: SearchEntry[] } = { files: [], buffers: [] }
const g = { cwd: '/' }

const init = async () => {
  g.cwd = await call.getcwd()

  // TODO: use builtin api fn for this
  define.Buffers`
    let current = bufnr('%')
    let bufs = filter(range(0, bufnr('$')), 'buflisted(v:val)')
    return map(bufs, {key, val -> { 'name': bufname(val), 'cur': val == current, 'mod': getbufvar(val, '&mod') }})
  `
}

const define: { [index: string]: Function } = onFnCall((name: string, [ fn ]: string[]) => {
  const expr = fn[0]
    .split('\n')
    .filter(m => m)
    .join('\\n')
    .replace(/"/g, '\\"')

  cmd(`exe ":fun! ${pascalCase(name)}(...) range\n${expr}\nendfun"`)
})


const getFiles = async (cwd: string): Promise<SearchEntry[]> => {
  const [ currentFile, files ] = await cc(call.expand('%f'), getProjectFiles(cwd))

  return files
    .filter((m: string) => m !== currentFile)
    .map((name: string) => ({
      name,
      base: basename(name),
      key: name,
      dir: formatDir(dirname(name))
    }))
}


const getBuffers = async (cwd: string): Promise<SearchEntry[]> => {
  const buffers = await call.Buffers()
  if (!buffers) return []
  
   return buffers
     .filter((m: VimBuffer, ix: number, arr: any[]) => arr.findIndex(e => e.name === m.name) === ix)
     .filter((m: VimBuffer) => !m.cur)
     .map(({ name, mod }) => ({
       name,
       base: basename(name),
       modified: mod,
       dir: cleanup(dirname(name), cwd)
     }))
}

action('files', async () => {
  //search.setOptions(cache.files).capture()
  cache.files = await getFiles(g.cwd).catch(derp)
  //search.setOptions(cache.files)

  const file = 'derp'
  //const file = await search.forSelection()
  if (!file) return
  cmd(`e ${file}`)
})

action('buffers', async () => {
  //search.setOptions(cache.buffers).capture()
  cache.buffers = await getBuffers(g.cwd).catch(derp)
  //search.setOptions(cache.buffers)

  const buffer = 'derp'
  //const buffer = await search.forSelection()
  if (!buffer) return
  cmd(`b ${buffer}`)
})

init()
