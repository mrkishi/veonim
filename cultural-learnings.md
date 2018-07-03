# cultural learnings of neovim for make benefit glorious feature of THE GRID

## interestings
- render event `option_set` has guifont. we can use this now instead of our own custom hack.
  - `guifont` allows us to replace `g:vn_font` and `g:vn_font_size`
  - look into `linespace` to replace `g:vn_line_height`

## questions
- verify `ext_messages` works with new ui protocol

## ref
ui doc:

https://github.com/UtkarshMe/neovim/blob/85cf9d6454a5c7980cdb86c7293facf597456905/runtime/doc/ui.txt

api doc:

https://github.com/neovim/neovim/pull/8455/commits/85cf9d6454a5c7980cdb86c7293facf597456905
