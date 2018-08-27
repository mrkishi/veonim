# docs

this is documentation. nobody reads documentation tho. this is so sad can we get 50 likes?

## quick start copypasta config

Below is a copypasta config to quickly get a feel for Veonim. It is highly recommended to personalize the settings according to your workflow (especially the keybindings!). See the rest of this guide for more info.

```vim
if exists('veonim')

" built-in plugin manager
Plug 'sheerun/vim-polyglot'
Plug 'tpope/vim-surround'
Plug 'tpope/vim-commentary'

" extensions for web dev
VeonimExt 'veonim/ext-css'
VeonimExt 'veonim/ext-json'
VeonimExt 'veonim/ext-html'
VeonimExt 'vscode:extension/sourcegraph.javascript-typescript'

" workspace management
let g:vn_project_root = '~/proj'
nno <silent> <c-t>p :call Veonim('vim-create-dir', g:vn_project_root)<cr>
nno <silent> ,r :call Veonim('change-dir', g:vn_project_root)<cr>

" multiplexed vim instance management
nno <silent> <c-t>c :Veonim vim-create<cr>
nno <silent> <c-g> :Veonim vim-switch<cr>
nno <silent> <c-t>, :Veonim vim-rename<cr>

" workspace functions
nno <silent> ,f :Veonim files<cr>
nno <silent> ,e :Veonim explorer<cr>
nno <silent> ,b :Veonim buffers<cr>
nno <silent> ,d :Veonim change-dir<cr>

" searching text
nno <silent> <space>fw :Veonim grep-word<cr>
vno <silent> <space>fw :Veonim grep-selection<cr>
nno <silent> <space>fa :Veonim grep<cr>
nno <silent> <space>ff :Veonim grep-resume<cr>
nno <silent> <space>fb :Veonim buffer-search<cr>

" color picker
nno <silent> sc :Veonim pick-color<cr>

" language server functions
nno <silent> sr :Veonim rename<cr>
nno <silent> sd :Veonim definition<cr>
nno <silent> sf :Veonim references<cr>
nno <silent> sh :Veonim hover<cr>
nno <silent> sl :Veonim symbols<cr>
nno <silent> so :Veonim workspace-symbols<cr>
nno <silent> sq :Veonim code-action<cr>
nno <silent> sp :Veonim show-problem<cr>
nno <silent> sk :Veonim highlight<cr>
nno <silent> sK :Veonim highlight-clear<cr>
nno <silent> <c-n> :Veonim next-problem<cr>
nno <silent> <c-p> :Veonim prev-problem<cr>
nno <silent> ,n :Veonim next-usage<cr>
nno <silent> ,p :Veonim prev-usage<cr>
nno <silent> <space>pt :Veonim problems-toggle<cr>
nno <silent> <space>pf :Veonim problems-focus<cr>
call VK('s-c-n', 'insert', {->execute('Veonim signature-help-next')})
call VK('s-c-p', 'insert', {->execute('Veonim signature-help-prev')})

endif
```

## design philosophy

The design goal of Veonim is to not replace Vim but extend it. Veonim also tries to leverage existing technologies. Some key points:
- do not replace core vim functinality unless we can greatly improve on it (e.g. statusline)
- Veonim is keyboard driven only. there is no mouse support, but that can change
- configuration is done the vim way: this means all user config happens in the `init.vim` with vimscript/lua, remote plugins (any language), or msgpack-rpc api
- Veonim provides a few set of primitives (commands/functions) and it is up to the user to construct their ideal workflow
- extending Veonim can either be done "the vim way" with plugins and remote-plugins, or with the vscode extension api. the primary reason for the vscode extension api is to leverage the existing catalog of language server and debugger extensions
- language support is provided via language-servers (https://langserver.org) loaded via vscode extensions

## language support

Language support is provided via language-servers (https://langserver.org). Technically Veonim is compatible with any programming language that has a language server, however the language server will need to be loaded from a vscode extension. Not all language servers have a vscode extension, but that can change.

The following languages have been "verified" to work with Veonim. More languages are in the process of being verified.

- typescript - `vscode:extension/sourcegraph.javascript-typescript`
- javascript - `vscode:extension/sourcegraph.javascript-typescript`
- html - `veonim/ext-html`
- json - `veonim/ext-json`
- css - `veonim/ext-css`
- scss - `veonim/ext-css`
- less - `veonim/ext-css`

## extensions

Extensions are installed by adding `VeonimExt 'some-extension-url-here'` to `init.vim`

The extension url can either be a Github `github-user-or-org/repo-name` or a VSCode extension URI.

Example of a VSCode extension hosted on Github:
```
VeonimExt 'veonim/ext-css'
```

Example of a VSCode extension:
```
VeonimExt 'vscode:extension/sourcegraph.javascript-typescript'
```

VSCode extensions can be found on the [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/vscode). The extension URI can be found by grabbing the link from the "Install" button of an extension page in the marketplace.

The vscode extension API is not yet 100% compatible with Veonim. It may never be 100% as some features do not make sense in Veonim. Compatibility will be improved as needed. Right now the focus is on supporting language server extensions and debugger extensions.

## keep init.vim compatible with neovim

It is recommended to wrap all Veonim configuration in `exists('veonim')` block(s) so that your 'init.vim' remains compatible when loaded in neovim (or vim).

```vim
if exists('veonim')
"config lol
endif
```

## vim plugin manager

Veonim will download and install any vim plugins defined with `Plug 'github-user-or-org/repo-name'` in `init.vim`. At this time plugins are downloaded from Github - this may change to allow additional sources. The built-in vim plugin manager is used for loading plugins - see `:h packages`

Example:
```
Plug 'tpope/vim-surround'
Plug 'tpope/vim-commentary'
```

## recommended vim plugins
I'm not in the business of telling you how to live your life, but in the spirit of building a "lightweight modal IDE" I would strongly recommend the following vim plugins:

[vim-polygot](https://github.com/sheerun/vim-polyglot) is a mega bundle of all vim language plugins supporting syntax highlighting, indentation, filetypes, etc. Each language plugin is of course lazy loaded only as needed.

```vim
Plug 'sheerun/vim-polyglot'
```

## recommended project workspace workflow
It is recommended to set the workspace / current working directory (`:cd` / `:pwd`) to the project you are currently working on. This workflow is similar to opening a folder as the workspace in VSCode.

Some features of Veonim will work best with this workflow. For example `:Veonim grep` or `:Veonim files` will look at `:pwd` as a starting point, otherwise default to the user home root.

You can use Veonim workspace features like `:Veonim change-dir` to easily assign workspaces to the current vim instance. With multiplexed vim instances it is trivial to maintain multiple project workspaces open: one project workspace per vim instance.

## features
Veonim features are accessible under the `:Veonim` command or `Veonim()` function call. For example, this is how you would use the file fuzzy find with a keybinding:
```
nnoremap <silent> ,f :Veonim files<cr>
```

The same thing with the function signature:
```
nnoremap <silent> ,f :call Veonim('files')<cr>
```

You can always explore/run all available Veonim features in the command line with `:Veonim` and browse the wildmenu list results.

### workspace features
- `files` - fuzzy file finder (powered by ripgrep)
  - best if used when vim current working directory (`:pwd`) is set to your current project (see `change-dir` or `:cd`). this limits the search scope to the current working directory
- `explorer` - directory/file browser. see [fuzzy menu keybindings](#fuzzy-menu-keybindings)
- `change-dir` (dir?) - a fuzzy version of `:cd`
  - optionally accepts a directory path to start from. e.g. `:Veonim change-dir ~/proj`
- `vim-create-dir` (dir?) - like `change-dir` but create a new multiplexed instance of vim with a directory selected from the fuzzy menu
  - optionally accepts a directory path to start from. e.g. `:Veonim vim-create-dir ~/proj`

### multiplexed vim sessions
Veonim supports the ability to run multiple instances of neovim at a time. In my development workflow I prefer to maintain one project per vim instance. To switch between projects I simply switch to the respective vim instance that has that project loaded. This way I maintain all tabs, windows, buffers, settings, colorschemes, etc. with its respective project.

When switching between instances the "background" instances are still running, but they are not wired up the user interface.

This feature is like going to a multiplex movie theater, where there are multiple cinema theaters under a single roof. It is the same idea as tmux sessions, i3 workspaces, mac os spaces, etc.

- `vim-create` - create a new vim instance with the given name
- `vim-rename` - rename the current vim instance
- `vim-switch` - switch between vim instances with a fuzzy menu
- `vim-create-dir` - create a new vim instance with a directory selected from the fuzzy menu
  - optionally accepts a directory path to start from. e.g. `:Veonim vim-create-dir ~/proj`

### search features
Realtime fuzzy search in the current project workspace using Ripgrep

- `grep` - open up grep search menu
- `grep-word` - grep search the current word under the cursor
- `grep-selection` - grep search the current visual selection
- `grep-resume` - open up grep search menu with the previous search query
- `buffer-search` - fuzzy search lines in the current buffer

### language features
The following features require a language server extension to be installed and activated for the current filetype.

Autocomplete is triggered automatically. Choosing completions can be done with `Tab` and `Shift-Tab`. Matching is done with a fuzzy-search engine. Keybinds and auto-trigger will be changed soon to be opt-in and configurable.

Autocompletion has two data sources for completion candidates:
- current buffer keywords (available in any buffer)
- intellisense provided by language servers (available only if language support configured)

Signature help (provides an overlay tooltip for function parameters and documentation) is triggered automatically (if supported)

- `definition` - jump to definition
- `references` - find references
  - opens up side menu similar to the grep menu. see [fuzzy menu keybindings](#fuzzy-menu-keybindings)
- `rename` - rename current symbol under cursor
- `hover` - show symbol information (and docs) in an overlay
- `symbols` - bring up a fuzzy menu to choose a symbol in the current buffer to jump to
- `workspace-symbols` - like `symbols` but across the entire project workspace. this can be pretty slow on large projects, especially on first usage. this is a limitation of the language server
- `highlight` - highlight the current symbol in the buffer
- `highlight-clear` - clear symbol highlight
- `next-usage` - jump to the next usage of the symbol under the cursor
- `prev-usage` - jump to the previous usage of the symbol under the cursor
- `code-action` - open an overlay menu displaying code action/quick-fix refactorings at the current position. e.g. remove unused declaration, etc.
- `show-problem` - bring up an overlay describing the problem with the highlighted (underlined) text
- `next-problem` - jump to the next problem in the current file. if there are no problems in the current file, jump to another file
- `prev-problem` - jump to the previous problem in the current file. if there are no problems in the current file, jump to another file
- `problems-toggle` - open or close the Problems list as an overlay at the bottom of the screen. does not focus the menu list
- `problems-focus` - focus the Problems list. if the Problems list is not open, it will also open it.

### bonus ~~meme~~ features
- `fullscreen` - open the Dark Portal and go fullscreen
- `pick-color` - open a color picker and change the current value under the cursor
- `devtools` - open up the devtools if ur an U83R1337H4XX0R
- `nc` - ehehehehe

### experimental/wip features
- `TermOpen` - open up a terminal that can be attached
- `TermAttach` - attach to a terminal session and parse the output for any compiler output adding any errors/warnings to the Problems system in Veonim (underline highlights, problems menu, jump between problems, etc.). this can be really useful for incremental compilers (btw: incremental compiler !== lang serv diagnostics or linter)
- `TermDetach` - stop parsing terminal output for compiler output
- `divination` - mark each line with a label. inputting the label keys will jump to that line. like easymotion
- `divination-search` - mark each search result in the buffer with a label that can be used to jump to (easymotion style)
- `viewport-search` - fuzzy search in the current buffer viewport only. on search completion, display jump-to labels like easymotion (`divination-search`). useful for quickly jumping to another place currently visible in the viewport
- `modify-colorscheme-live` - open a colorscheme file. move cursor to color value. trigger this command. a color picker is opened, and whenever the color is changed in the color picker, the colors are updated across all of vim LIVE. WE'LL DO IT LIVE!

## fuzzy menu keybindings
In general all fuzzy menus share the same keybindings. These are hardcoded right now, but they will be configurable in the future (once I figure out a good way to do it)

- `escape` - close menu
- `enter` - close menu and perform action on the currently selected item (e.g. open file in the `files` fuzzy menu)
- `tab` - if there are multiple input fields, switch focus between inputs (e.g. `grep` menu)
- `ctrl/cmd + w` - delete word backwards
- `ctrl/cmd + j` - select next item
- `ctrl/cmd + k` - select previous item
- `ctrl/cmd + n` - select next group (usually items grouped by files like in `grep` menu or `problems` menu)
- `ctrl/cmd + p` - select previous group
- `ctrl/cmd + d` - scroll and select an item further down the list
- `ctrl/cmd + u` - scroll and select an item further up the list
- `ctrl/cmd + o` - jump up a directory in any explorer menu (`explorer`, `change-dir`, etc.)

## create your own fuzzy menu
You like all these fuzzy menus? Why not make your own? Veonim lets you build your own. Call `VeonimMenu` with an input list and a completion handler that will receive the selected item.

`VeonimMenu(placeholderDescription: string, listItems: string[], onItemSelectHandler: Function)`

Here is an example of a "task runner" fuzzy menu:

```vim
let g:tasks = {
\'test': {->jobstart('npm test')},
\'start': {->jobstart('npm start')},
\'devtools': {->execute('Veonim devtools')},
\'fullscreen': {->execute('Veonim fullscreen')}
\}

fun! RunTask(name)
  if has_key(g:tasks, a:name)
    let Func = g:tasks[a:name]
    call Func()
  endif
endfun

nno <silent> <c-'> :call VeonimMenu('run task', keys(g:tasks), {m->RunTask(m)})<cr>
```

![](https://veonim.github.io/veonim/tasks.png)

## create your own overlay fuzzy menu
Create your own overlay fuzzy menu. Works like `VeonimMenu` but displays an overlay menu at the current cursor position.

Here is an example of a "search current word on the selected website" fuzzy overlay menu:

```vim
let g:destinations = {
\'google': '',
\'node': 'site:nodejs.org',
\'mdn': 'site:developer.mozilla.org',
\'stackoverlow': 'site:stackoverflow.com',
\'devdocs': 'site:devdocs.io',
\}

fun! OpenBrowser(url) range
  "reference: https://stackoverflow.com/questions/8708154/open-current-file-in-web-browser-in-vim
  if g:vn_platform == 'darwin' | let cmd = 'open' | endif
  if g:vn_platform == 'linux' | let cmd = 'xdg-open' | endif
  if g:vn_platform == 'win32' | let cmd = 'google-chrome' | endif
  call jobstart(cmd . " '" . a:url . "'")
endfun

fun! SearchWeb(dest, visual) range
  if has_key(g:destinations, a:dest)
    let base = 'https://www.google.com/search?q='
    let query = a:visual ?  getline("'<")[getpos("'<")[2]-1:getpos("'>")[2]] : expand('<cword>')
    let url = base . g:destinations[a:dest] . '%20' . query . '&btnI'
    call OpenBrowser(url)
  endif
endfun

nno <silent> gd :call VeonimOverlayMenu('search on', keys(g:destinations), {m->SearchWeb(m,0)})<cr>
vno <silent> gd :call VeonimOverlayMenu('search on', keys(g:destinations), {m->SearchWeb(m,1)})<cr>
```

![](https://veonim.github.io/veonim/user-menu.png)

## open file from terminal in current window

When you are in `:term` you can open a file in the current window with the `vvim` executable - it is included and configured for Veonim terminals.

Like this:
```
$ ls
new-js-framework.js    npm-is-a-meme.js    me-gusta.js
$ vvim new-js-framework.js
```

## remapping input keys

### bind keys that vim can't
Vim can't bind key combinations like `ctrl + shift + e`. Veonim can bind any combination of `cmd/ctrl`, `shift`, `alt`, `meta/super`. We can use the `VK` function to achieve this. For example:

```vim
"shift + ctrl/cmd + |
call VK('s-c-|', 'normal', {->execute('Veonim devtools')})
"shift + ctrl/cmd + n
call VK('s-c-n', 'insert', {->execute('Veonim signature-help-next')})
"shift + ctrl/cmd + p
call VK('s-c-p', 'insert', {->execute('Veonim signature-help-prev')})
```

### remap modifiers
It is possible to change keyboard modifiers with `remap-modifier`. For example to swap `ctrl` and `meta`:
```vim
Veonim remap-modifier C D
Veonim remap-modifier D C
```

### transform key events

If you are familar with key remapping in karabiner/xmodmap/xfb then this concept will be familiar. Basically since we are in a GUI we have access to both `keydown` + `keyup` keyboard events. This allows us to implement some clever remappings. For example:

Remap 'Command' to be 'Command' or 'Escape'. If 'Command' is pressed with another key, send 'Command'. If 'Command' is pressed alone, send 'Escape'.
```vim
Veonim key-transform up {"key":"Meta","metaKey":true} e=>({key:'<Esc>'})
```

Turn `;` key into an extra modifier key. When `;` is being held down, send `semicolon` + the typed key. This allows me to create a mapping like `nno ;n :Veonim next-problem<cr>` and then I can hold down `;` and spam `n` to jump between problems.
```vim
Veonim key-transform hold {"key":";"} e=>({key:';'+e.key})
```

## statusline

### left section
- current working directory `:pwd` relative to `g:vn_project_root`
- current git branch
- git additions / git deletions
- language server enabled & activated

### center section
- macro recording indicator

### right section
- problem count / warning count
- cursor line number / column number
- list of vim tabs (only tab number displayed to condense space - think of it like i3 workspaces)
