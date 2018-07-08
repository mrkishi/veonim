# cultural learnings of neovim for make benefit glorious feature of THE GRID

## tasks
- canvas fills with wrong color on resize?
- resize canvas and canvasBox when `win_position` updates
  - see TODO in `window-canvas :: api.resize`
- layout windows using css grid
- create window nameplate component
- get nvim_api info for windows (title, modified, etc.)
- why highlights messed up
- sometimes render glitches:
  - scrolling offset not always cleared up (try scrolling - too hard to explain)
- cleanup deprecated (aka v1 ui protocol) event handlers in render.ts
  - `mode_info_set`:
    - figure out the color highlights in there. should not need to call anymore?
- shadow buffers:
  - creating shadow-buffer adds an extra window. figure out how to fix this

## interestings
- do we flicker on canvas resize? if so, what about cache canvas then drawImage after resize?
- render event `option_set` has `guifont` and `linespace`. we can use this now instead of our own custom global variables.
  - `guifont` replaces `g:vn_font` and `g:vn_font_size`
  - `linespace` replaces `g:vn_line_height`

## questions
- is font-atlas faster than `fillText`? it seems slower...?
- verify `ext_messages` works with new ui protocol
- `ui` api is wrong for `grid_line`. added comment in issue review. manually changing api.ts for now
- `ext_messages` - how to handle macro recording events?

## can we copystrike shitty engineering?!?
- we are sending WAYYYY too many commands on the nvim_api on startup. either batch or do via vimscript
- now that we have semantic highlights via `ext_hlstate` we don't need to query `nvim_get_hl...` anymore. use local cache pls kthx

## ref
ext_win doc:
- https://github.com/UtkarshMe/neovim/blob/85cf9d6454a5c7980cdb86c7293facf597456905/runtime/doc/ui.txt 
ui doc:
- https://github.com/bfredl/neovim/blob/ea8d85d9b7996c788006c3aa7c319efbc7354655/runtime/doc/ui.txt

api doc:
- https://github.com/neovim/neovim/pull/8455/commits/85cf9d6454a5c7980cdb86c7293facf597456905
