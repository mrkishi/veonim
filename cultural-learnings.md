# cultural learnings of neovim for make benefit glorious feature of THE GRID

## tasks
- when closing a split, the windows which need to resize will flickerererer
  - i assume this is because we get a `grid_resize` event which causes the canvas
      to redraw. how can we resize the canvas without causing it to flicker.
- creating new window causes black flicker... perhaps too slow to init and size canvas. can we precache canvas?
    - i'm not seeing this happening anymore. i should throttle app and make sure its not
      just my computer and how it feels
- redo cursor
  - need the window positioning calc funcs before we know how to position cursor
- investigate if canvas padding is still taking effect?
  - it is - but before the padding was 10, now it's 4. 4 feels too clausterphobic
  - cant increase padding anymore than 4 because otherwise we have to resize windows to fit
  - as a first round we will not do resizing. that will be step2
- cleanup/redo window-canvas positionToXY functions.
  - only need for absolute position? aka hover elements, cursor, etc.
    - any relative positions should add themselves to the container...
    - wait... what about relative... still need to XY if position to row/col
        - think of jump labels. need to attach to a search result, but still
          in relative container
- window methods
  - position.absolute(row, col) => { x, y } relative to #canvas-container
  - position.relative(row, col) => { x, y } relative to current window element (not including nameplate)
  - getVisibleLines
  - use editorTopLine + editorBottomLine + cursor position to figure out
    where to draw annotations on top of current editor. make a poc and make
    sure it works
- shadow buffers:
  - creating shadow-buffer adds an extra window. figure out how to fix this

## interestings
- render event `option_set` has `guifont` and `linespace`. we can use this now instead of our own custom global variables.
  - `guifont` replaces `g:vn_font` and `g:vn_font_size`
  - `linespace` replaces `g:vn_line_height`

## questions
- is adding neovim.ts to windows2.ts increase startup time?
- memoize window-canvas px calculations?
- is font-atlas faster than `fillText`? it seems slower...?
- verify `ext_messages` works with new ui protocol
- `ui` api is wrong for `grid_line`. added comment in issue review. manually changing api.ts for now
- `ext_messages` - how to handle macro recording events?

## can we copystrike shitty engineering?!?
- we are sending WAYYYY too many commands on the nvim_api on startup. either batch or do via vimscript
    - some of these happen in web workers, but still... too much
- now that we have semantic highlights via `ext_hlstate` we don't need to query `nvim_get_hl...` anymore. use local cache pls kthx

## ref
ext_win doc:
- https://github.com/UtkarshMe/neovim/blob/85cf9d6454a5c7980cdb86c7293facf597456905/runtime/doc/ui.txt 
ui doc:
- https://github.com/bfredl/neovim/blob/ea8d85d9b7996c788006c3aa7c319efbc7354655/runtime/doc/ui.txt

api doc:
- https://github.com/neovim/neovim/pull/8455/commits/85cf9d6454a5c7980cdb86c7293facf597456905

## PRs of interest
- multigrid: https://github.com/neovim/neovim/pull/8455
- ui protocol v2: https://github.com/neovim/neovim/pull/8221
- external messages: https://github.com/neovim/neovim/pull/7466
- floating windows: https://github.com/neovim/neovim/pull/6619
- external wincmds: https://github.com/neovim/neovim/pull/8707
