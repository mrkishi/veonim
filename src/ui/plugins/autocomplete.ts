import { call, autocmd, notify, define, request } from '../neovim-client'
import { findIndexRight } from '../../utils'
import { onVimCreate } from '../sessions'
import { sub } from '../../dispatch'
const { cmd, setVar } = notify
const { expr, getCurrentLine } = request

// TODO: get from lang server
const completionTriggers = new Map<string, RegExp>()
completionTriggers.set('javascript', /[^\w\$]/)

// TODO: i wonder if it might be more prudent to create a veonim plugin and install once...
onVimCreate(() => {
  const g = {
    startIndex: 0,
    completionItems: ['luke', 'leia', 'rey', 'kenobi', 'lol']
  }

  cmd(`aug Veonim | au! | aug END`)

  define.VeonimComplete`
    return a:1 ? g:veonim_complete_pos : g:veonim_completions
  `

  define.CompleteScroll`
    if len(g:veonim_completions)
      if g:veonim_completing
        return a:1 ? "\\<c-n>" : "\\<c-p>"
      endif

      let g:veonim_completing = 1
      return a:1 ? "\\<c-x>\\<c-u>" : "\\<c-x>\\<c-u>\\<c-p>\\<c-p>"
    endif

    return a:1 ? "\\<tab>" : "\\<c-w>"
  `

  setVar('veonim_completing', 0)
  setVar('veonim_complete_pos', 1)
  setVar('veonim_completions', g.completionItems)

  cmd(`set completefunc=VeonimComplete`)
  cmd(`ino <expr> <tab> CompleteScroll(1)`)
  cmd(`ino <expr> <s-tab> CompleteScroll(0)`)

  autocmd.completeDone(async () => {
    cmd(`let g:veonim_completing = 0`)
    const { word } = await expr(`v:completed_item`)
    console.log('completed word:', word)
  })

  autocmd.insertLeave(() => {
    g.startIndex = 0
  })

  const findQuery = (filetype: string, line: string, column: number) => {
    const pattern = completionTriggers.get(filetype) || /[^\w]/
    const start = findIndexRight(line, pattern, column - 2) || 0
    const startIndex = start ? start + 1 : 0
    const query = line.slice(startIndex, column - 1) || ''
    const leftChar = line[start]
    // TODO: should startIndex be modified for leftChar?
    return { startIndex, query, leftChar }
  }

  const getPos = async () => {
    // TODO: use nvim_window_* api instead
    const [ buffer, line, column, offset ] = await call.getpos('.')
    return { buffer, line, column, offset }
  }

  const update = (items: string[]) => {
    // TODO: make sure to validate the right data being sent
    // TODO: send more than just strings. send rich data with id metadata.
    // that way when we get external popup menu notifications we can hook into local
    // richer metadata to populate ui completion menu
    setVar('veonim_completions', items)
  }

  const getCompletions = async () => {
    const line = await getCurrentLine()
    const { column } = await getPos()
    const { startIndex, query } = findQuery('javascript', line, column)

    //console.log(`      `)
    //console.log('startIndex:', startIndex)
    //console.log('query:', JSON.stringify(query))
    //console.log('leftChar:', leftChar)
    // TODO: if (left char is .) we need to do semantic completions
    // left char is === completionTriggers regex
    // set complete_pos
    if (query.length) {
      // TODO: call keywords + semantic = combine -> filter against query
      // use subsequence matching with case sensitivy priority
      // YCM has a good algo. maybe fzy too. USE FUZZALDRIN? pretty goooooood
      // TODO: only call this if query has changed 
      update(g.completionItems)

      // TODO: do we always need to update this?
      // TODO: cache last position in insert session
      // only update vim if (changed) 
      // use cache - if (same) dont re-ask for keyword/semantic completions from avo
      //if (g.startIndex !== startIndex || !g.visible) {
        //console.log(`showing cmenu`)
        //cmd(`let g:veonim_complete_pos = ${startIndex}`)
        //const { x, y } = await getScreenCursorPos()
        //show(Math.max(0, startIndex - 1), vim.column, x, y)
      //}
      cmd(`let g:veonim_complete_pos = ${startIndex}`)
    } else {
      console.log('no query, wtf lol')
    }
  }

  const refreshPosition = async (mode: string) => {
    //const { buffer, line, column, offset } = await getPos()
    //merge(current, { buffer, line, column, offset, mode })
    if (mode !== 'insert') return
    getCompletions()
    //findSignatureHint()
  }

  autocmd.cursorMoved(() => refreshPosition('normal'))
  autocmd.cursorMovedI(() => refreshPosition('insert'))

  // TODO: yeah good idea, but hook up in neovim instance class
  //autocmd.bufEnter(debounce(async m => {
    //current.file = await call.expand('%f')
    //// TODO: use filetype for js-langs
    //current.filetype = await expr(`&filetype`)
    ////updateServer()
  //}, 100))

  sub('pmenu.show', ({ items, selIx, row, col }) => {
    console.log('show', items, 'sel', selIx, 'at', row, col)
  })

  sub('pmenu.select', ix => {
    console.log('selected', ix)
  })

  sub('pmenu.hide', () => {
    console.log('hide')
  })

})
