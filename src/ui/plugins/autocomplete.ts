import { autocmd, notify, define } from '../neovim-client'
import { onVimCreate } from '../sessions'
//import ui from './canvasgrid'
const { cmd } = notify

// TODO: i wonder if it might be more prudent to create a veonim plugin and install once...
onVimCreate(() => {
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

  cmd(`let g:veonim_completing=0`)
  cmd(`let g:veonim_complete_pos=1`)
  cmd(`let g:veonim_completions=['luke', 'leia', 'rey', 'kenobi']`)

  cmd(`ino <expr> <tab> CompleteScroll(1)`)
  cmd(`ino <expr> <s-tab> CompleteScroll(0)`)

  autocmd('WinEnter', () => {
    console.log('entered a window, i think...')
  })
})



// TODO: how to autocmd?
  //autocmd.completeDone(async m => {
    //ex(`let g:vimtron_completing = 0`)
    //const { word } = await expr(`v:completed_item`)
    //console.log('completed word:', word)
  //})




