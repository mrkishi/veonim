# cultural learnings of neovim for make benefit glorious feature of THE GRID

## tasks
- cleanup deprecated (aka v1 ui protocol) event handlers in render.ts
- lets not do the resizing bullshit anymore. just define canvas vertical
  paddings to be char-width / 2
  - vsep takes up 1 char anyways, so we just subtract total container area cols - 1

## interestings
- render event `option_set` has `guifont` and `linespace`. we can use this now instead of our own custom global variables.
  - `guifont` replaces `g:vn_font` and `g:vn_font_size`
  - `linespace` replaces `g:vn_line_height`

## questions
- verify `ext_messages` works with new ui protocol
- `ui` api is wrong for `grid_line`. added comment in issue review. manually changing api.ts for now

## ref
ui doc:

- https://github.com/bfredl/neovim/blob/ea8d85d9b7996c788006c3aa7c319efbc7354655/runtime/doc/ui.txt

api doc:

- https://github.com/neovim/neovim/pull/8455/commits/85cf9d6454a5c7980cdb86c7293facf597456905
