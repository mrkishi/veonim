import { autocmd, notify, define, request } from '../neovim-client'
import { findIndexRight } from '../../utils'
import { onVimCreate } from '../sessions'
//import ui from './canvasgrid'
const { cmd } = notify
const { expr, getCurrentLine } = request

// TODO: get from lang server
const completionTriggers = new Map<string, RegExp>()
completionTriggers.set('javascript', /[^\w\$]/)

// TODO: i wonder if it might be more prudent to create a veonim plugin and install once...
onVimCreate(() => {
  let startIndex = 0

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

  cmd(`set completefunc=VeonimComplete`)

  cmd(`let g:veonim_completing = 0`)
  cmd(`let g:veonim_complete_pos = 1`)
  cmd(`let g:veonim_completions = ['luke', 'leia', 'rey', 'kenobi']`)

  cmd(`ino <expr> <tab> CompleteScroll(1)`)
  cmd(`ino <expr> <s-tab> CompleteScroll(0)`)

  autocmd.winEnter(() => {
    console.log('entered a window, i think...')
  })

  autocmd.completeDone(async () => {
    cmd(`let g:veonim_completing = 0`)
    const { word } = await expr(`v:completed_item`)
    console.log('completed word:', word)
  })

  autocmd.insertLeave(() => {
    startIndex = 0
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

  const getCompletions = async () => {
    const line = await getCurrentLine()
    const { startIndex, query, leftChar } = findQuery('javascript', line, ui.cursor.col)
    // TODO: when leftChar is ( startIndex goes -1 one too far

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
      // YCM has a good algo. maybe fzy too
      // TODO: only call this if query has changed 
      //update(g.completionItems)

      // TODO: do we always need to update this?
      // TODO: cache last position in insert session
      // only update vim if (changed) 
      // use cache - if (same) dont re-ask for keyword/semantic completions from avo
      if (g.startIndex !== startIndex || !g.visible) {
        console.log(`showing cmenu`)
        cmd(`let g:veonim_complete_pos = ${startIndex}`)
        const { x, y } = await getScreenCursorPos()
        show(Math.max(0, startIndex - 1), vim.column, x, y)
      }
    } else {
      console.log('no query, wtf lol')
    }
  }
})
