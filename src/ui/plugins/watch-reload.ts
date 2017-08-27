import { cmd, autocmd, call, define } from '../neovim'
const watch = require('node-watch')

define.OpenPaths`
  return map(filter(range(0, bufnr('$')), 'buflisted(v:val)'), {k, buf -> fnamemodify(bufname(buf), ':p')})\\n
`

const open = new Set<string>()

autocmd.bufCreate(async () => {
  const openPaths = await call.OpenPaths()
  const newPaths = openPaths
    .filter(p => !open.has(p))
    .filter((p, ix, arr) => arr.indexOf(p) === ix)

  newPaths.forEach(path => {
    open.add(path)
    watch(path, () => {
      console.log(`${path} changed!`)
      // TODO: only auto-watch if set autoread is set? this won't actually reload file...?
      cmd(`checktime ${path}`)
    })
  })
})

// TODO: yeah i think it might be more efficient to watch dirs if multi files in same place?
//on session switch, cache open buffers (per session).
//on buf change, register pendings for bg session. 
//when switchback, load all register pendings. (or... just call :checktime...)
