# docs

here come dat docs boi. ayyy lmao

## quick start

Below is a snippet of configuration settings if you just want to quickly try out some Veonim features. It is highly recommended to personalize the settings according to your workflow (especially the keybindings!). See the rest of this guide for more info.

```vim
if exists('veonim')

" built-in plugin manager
Plug 'tpope/vim-surround'
Plug 'tpope/vim-commentary'

" extensions for web dev
VeonimExt 'veonim/ext-css'
VeonimExt 'veonim/ext-json'
VeonimExt 'veonim/ext-html'
VeonimExt 'vscode:extension/sourcegraph.javascript-typescript'

" root directory to be used for project switcher menu
let g:vn_project_root = '~/proj'

" multiplexed vim instance management
nno <silent> <c-t>c :Veonim vim-create<cr>
nno <silent> <c-g> :Veonim vim-switch<cr>
nno <silent> <c-t>, :Veonim vim-rename<cr>
nno <silent> <c-t>p :call Veonim('vim-create-dir', g:vn_project_root)<cr>

" workspace functions
nno <silent> ,f :Veonim files<cr>
nno <silent> ,e :Veonim explorer<cr>
nno <silent> ,b :Veonim buffers<cr>
nno <silent> ,d :Veonim change-dir<cr>
nno <silent> ,r :call Veonim('change-dir', g:vn_project_root)<cr>

" searching text
nno <silent> <space>fw :Veonim grep-word<cr>
vno <silent> <space>fw :Veonim grep-selection<cr>
nno <silent> <space>fa :Veonim grep<cr>
nno <silent> <space>ff :Veonim grep-resume<cr>
nno <silent> <space>fb :Veonim buffer-search<cr>

" misc
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

## design goals

The design goal of Veonim is to not replace Vim but extend it. Veonim also tries to leverage existing technologies. Some key points:
- do not replace core vim functinality unless we can greatly improve on it (e.g. statusline)
- Veonim is keyboard driven only. there is no mouse support, but that can change
- configuration is done the vim way: this means all user config happens in the `init.vim` with vimscript/lua, remote plugins (any language), or msgpack-rpc api
- Veonim provides a few set of primitives (commands/functions) and it is up to the user to construct their ideal workflow
- extending Veonim can either be done "the vim way" with plugins and remote-plugins, or with the vscode extension api. the primary reason for the vscode extension api is to leverage the existing catalog of language server and debugger extensions
- language support is provided via language-servers (https://langserver.org) loaded via vscode extensions

## language support

Language support is provided via language-servers (https://langserver.org). Technically Veonim is compatible with any programming language that has a language server, however the language server will need to be loaded from a vscode extension. Not all language servers have a vscode extension, but that can change.

The following languages are "verified" to be working with Veonim. More will be verified soon or as demand arises.

- typescript - `vscode:extension/sourcegraph.javascript-typescript`
- javascript - `vscode:extension/sourcegraph.javascript-typescript`
- html - `veonim/ext-html`
- json - `veonim/ext-json`
- css - `veonim/ext-css`

## extensions

Extensions are installed by adding `VeonimExt 'some-extension-url-here'` to your `init.vim` and reloading the vim configuration, starting a new multiplexed vim session, or restarting Veonim.

The extension url can either be a `user-or-organization/repository-name` which will be fetched from Github or a VSCode extension URI.

Example of a VSCode extension hosted on Github:
```
VeonimExt 'veonim/ext-css'
```

Example of a VSCode extension:
```
VeonimExt 'vscode:extension/sourcegraph.javascript-typescript'
```

VSCode extensions can be found on the [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/vscode). The extension URI can be found by right-clicking the "Install" button and clicking "Copy Link Address" (Firefox) / "Copy??" (Chrome)

The vscode extension API is not yet 100% compatible with Veonim. It may never be 100%. Compatibility will be added as needed. Right now the focus is on supporting language server extensions and debugger extensions.

## keep init.vim compatible with neovim

It is recommended to wrap all Veonim configuration in `exists('veonim')` block(s) so that your init.vim remains compatible when loaded in neovim (or vim).

```vim
if exists('veonim')
"config lol
endif
```

## vim plugin manager

Veonim will install/remove any vim plugins into the (n)vim built-in plugin manager directories. Defining plugins can be done by adding `Plug 'github-user-or-org/repo-name'` to your `init.vim`. At this time plugins are downloaded from Github - this may improve.

Example:
```
Plug 'tpope/vim-surround'
Plug 'tpope/vim-commentary'
```

## features
Veonim features are accessible under the `:Veonim` command or `Veonim()` function call. For example, this is how you would use the file fuzzy find with a keybinding:

`nnoremap <silent> ,f :Veonim files<cr>`

You can always explore/run all the Veonim features in the command line with `:Veonim` and browsing the wildmenu list results.

### workspace features
- `files` - fuzzy file finder
  - best if used after changing directory with `:cd` to limit search scope
- `explorer` - directory/file browser

### search features

### language features
The following features require a language server extension to be installed and activated for the current filetype.

Autocomplete is triggered automatically. Choosing options can be done with `Tab` and `Shift-Tab`. Matching is done with a fuzzy-search engine. Automatic triggering and the option choosing keybinds will be changed soon to be opt-in/configurable.

Autocompletion has two data sources for completion candidates:
- current buffer keywords (available everywhere)
- intellisense provided by language servers (available only if language support configured)

Signature help (provide an overlay tooltip for function parameters/docs) is triggered automatically if the current buffer filetype has a valid language server extension installed and activated.

- `definition` - jump to definition
- `references` - find references
  - opens up side menu - this menu works just like the grep menu
- `rename` - rename current symbol under cursor
- `hover` - show symbol information (and docs) in an overlay
  - i prefer manually triggering this command from a keybinding, but it could be bound to an event like `CursorHold` to emulate IDE behavior
- `symbols` - bring up a fuzzy menu to choose a symbol in the current buffer to jump to
- `workspace-symbols` - like `symbols` but across the entire project workspace. this can be pretty slow on large projects, especially on first usage. this is a limitation of the language server
- `show-problem` - bring up an overlay describing the problem with the highlighted (underlined) text
- `highlight` - highlight the current symbol in the buffer
- `highlight-clear` - clear symbol highlight

### bonus ~~meme~~ features
- `pick-color` - open a color picker and change the current value under the cursor
- `modify-colorscheme-live` [experimental] - open a colorscheme file. move cursor to color value. trigger this command. a color picker is opened, and whenever the color is changed in the color picker, the colors are updated across all of vim LIVE. WE'LL DO IT LIVE!
