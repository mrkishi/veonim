import { onServerRequest, fullBufferUpdate, partialBufferUpdate, references, definition, rename, signatureHelp } from './langserv/adapter'
import { ex, action, autocmd, until, cwdir, call, expr, getCurrentLine, feedkeys, define } from './ui/neovim'
import { TextDocumentItem, TextDocumentIdentifier } from 'vscode-languageserver-types'
import { cc, debounce, merge, readFile, NewlineSplitter } from './utils'
import Ripgrep from '@veonim/ripgrep'

let pauseUpdate = false
const cache = { filetype: '', file: '', revision: -1, cwd: '' }

const uriToPath = (m: string) => m.replace(/^\S+:\/\//, '')
const getFiles = (path: string): Promise<string[]> => new Promise(done => {
  const results: string[] = []
  const rg = Ripgrep(['--files'], { cwd: path })
  rg.stdout.pipe(NewlineSplitter()).on('data', (path: string) => results.push(path))
  rg.on('exit', () => done(results))
})

define.ModifiedBuffers`
  let current = bufnr('%')
  let bufs = filter(range(0, bufnr('$')), 'buflisted(v:val)')
  return map(filter(map(bufs, {key, val -> { 'path': expand('#'.val.':p'), 'mod': getbufvar(val, '&mod') }}), {key, val -> val.mod == 1}), {key, val -> val.path})
`

define.PatchCurrentBuffer`
  let pos = getcurpos()
  let patch = a:1
  for chg in patch
    if chg.op == 'delete'
      exec chg.line . 'd'
    elseif chg.op == 'replace'
      call setline(chg.line, chg.val)
    elseif chg.op == 'append'
      call append(chg.line, chg.val)
    end
  endfor
  call cursor(pos[1:])
`

const updateServer = async (lineChange = false) => {
  // TODO: better, more async
  const [ , line, column ] = await call.getpos('.')

  if (lineChange) partialBufferUpdate({
    ...cache,
    line,
    column,
    buffer: [ await getCurrentLine() ]
    //buffer: [ await call.getline('.') as string ]
  })

  else fullBufferUpdate({
    ...cache,
    line,
    column,
    // TODO: buffer.getLines api built-in
    buffer: await call.getline(1, '$') as string[]
  })
}

const attemptUpdate = async (lineChange = false) => {
  if (pauseUpdate) return
  // TODO: buffer.changedtick api built-in
  const chg = await expr('b:changedtick')
  if (chg > cache.revision) updateServer(lineChange)
  cache.revision = chg
}

autocmd.bufEnter(debounce(async () => {
  const [ cwd, file, filetype ] = await cc(cwdir(), call.expand(`%f`), expr(`&filetype`))
  // TODO: changedtick -> revision
  merge(cache, { cwd, file, filetype, revision: -1 })
  updateServer()
}, 100))

autocmd.textChanged(debounce(() => attemptUpdate(), 200))
autocmd.textChangedI(() => attemptUpdate(true))

action('references', async () => {
  const [ , line, column ] = await call.getpos('.')
  const refs = await references({ ...cache, line, column })

  await call.setloclist(0, refs.map(m => ({
    lnum: m.line,
    col: m.column,
    text: m.desc
  })))

  ex('lopen')
  ex('wincmd p')
})

action('definition', async () => {
  const [ , line, column ] = await call.getpos('.')
  const loc = await definition({ ...cache, line, column })
  if (!loc || !loc.line || !loc.column) return
  await call.cursor(loc.line, loc.column)
})

action('rename', async () => {
  const [ , line, column ] = await call.getpos('.')
  pauseUpdate = true
  await feedkeys('ciw')
  await until.insertLeave()
  const newName = await expr('@.')
  await feedkeys('u')
  pauseUpdate = false
  const patches = await rename({ ...cache, line, column, newName })
  // TODO: change other files besides current buffer
  patches.forEach(({ operations }) => call.PatchCurrentBuffer(operations))
})

action('hint', async () => {
  const [ , line, column ] = await call.getpos('.')
  const hint = await signatureHelp({ ...cache, line, column })
  console.log(hint)
})

interface ContentParams {
  textDocument: TextDocumentIdentifier
}

interface FilesParam {
  base?: string
}

onServerRequest<ContentParams, TextDocumentItem>('textDocument/xcontent', async ({ textDocument }) => {
  const filepath = uriToPath(textDocument.uri)
  const modifiedBuffers = await call.ModifiedBuffers()

  if (modifiedBuffers.includes(filepath)) {
    // TODO: use built-in neovim api for this?
    // getbufvar(name, '') gets full dict. might be faster to get all to client then parse out
    const bufferName = await call.bufname(filepath)
    const [ lines, filetype, revision ] = await Promise.all([
      call.getbufline(bufferName, 1, '$'),
      call.getbufvar(bufferName, '&filetype'),
      call.getbufvar(bufferName, 'changedtick'),
    ])

    return {
      // https://code.visualstudio.com/docs/languages/identifiers (may not match 1:1 with vim filetype)
      languageId: filetype,
      uri: textDocument.uri,
      version: revision,
      text: lines,
    }
  }

  const fileContents = await readFile(filepath, { encoding: 'utf8' })
  // TODO: get filetype... extension matching might not be enough
  //https://vi.stackexchange.com/questions/9962/get-filetype-by-extension-or-filename-in-vimscript
  // how important is the languageId to the server anyways...
  // idk, just do a dumb lookup by file extension, if it fails, send empty string
  // if anyone complains, revisit later. otherwise the complexity of this could get out of hand
  // (spawn new separate detached vim instance and load file into it - then use &filetype)
  // because vim looks beyond file extension - it parses the first few lines to deduce filetype
  // also, vim may not have all possible filetypes for more esoteric languages.
  // lookup seems simplest.
  return {
    uri: textDocument.uri,
    languageId: 'typescript',
    version: 1,
    text: fileContents.split('\n')
  }
})

onServerRequest<FilesParam, TextDocumentIdentifier[]>('workspace/xfiles', async ({ base }: { base?: string }) => {
  const cwd = base ? uriToPath(base) : await cwdir()
  const files = await getFiles(cwd)
  return files.map(path => ({ uri: `file://${path}` }))
})
