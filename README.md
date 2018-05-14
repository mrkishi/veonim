![](https://veonim.github.io/veonim/header.png)

veonim is a modern lightweight modal IDE built on neovim. my goal is to create my ideal programming environment

![](https://veonim.github.io/veonim/smart.png)

## features

- cross platform (and no external dependencies needed)
- rich language integration built on language servers (any language supporting LSP can work - see http://langserver.org)
    - auto completion
    - go to definition
    - find references
    - symbol search
    - show hover information
    - provide signature hint info
    - diagnostics (errors/warnings)
    - refactoring (rename, quick fix, code actions, etc.)
    - highlight symbols
- multiple concurrent multiplexed vim instances
- built-in vim plugin manager
- (limited) vscode extension support - should support language server extensions - more api support can be added as needed
- rich key mapping support with support for keyup + keydown events (think karabiner) - for example:
  - remap caps lock to escape
  - map commands to all modifiers such as ctrl + shift + alt + key
  - swap modifiers -> switch command and control
  - create additional modifiers with custom key transforms (e.g. create layers: mappings like `<c-s>` `<c-m>` but with another key `;s` `;m`)
- project find based on ripgrep
- high performance optimized GPU rendering
- fuzzy find for files and buffers
- keyboard driven fuzzy file + directory explorer
- graphical neovim ui including windows, tabs, command line, status line, messages, cursor, cursorline, colorscheme adaptable interface etc.
- project/workspace/cd management
- reload vim buffers when modified (e.g. when edited in another program)
- everything configured via vim config file (init.vim) and scriptable with vimscript
- create fuzzy overlay menus and floating overlay menus with user defined options (e.g. build custom task menus)
- built-in statusline (displays current project, git branch, git changes, warning/problem count, cursor position, and tabpages)
- color picker + live vim colorscheme editing
- (experimental) parse :term output and display problems in editor
- and more!

## screenshots

### auto completion
![](https://veonim.github.io/veonim/completion.png)

### fuzzy file finder
![](https://veonim.github.io/veonim/files.png)

### find in project
![](https://veonim.github.io/veonim/grep.png)

### symbol search
![](https://veonim.github.io/veonim/symbols.png)

### signature hint
![](https://veonim.github.io/veonim/hint.png)

### hover information
![](https://veonim.github.io/veonim/hover.png)

### problems
![](https://veonim.github.io/veonim/problems.png)

### explorer
![](https://veonim.github.io/veonim/explorer.png)

### references
![](https://veonim.github.io/veonim/references.png)

### user defined menus
![](https://veonim.github.io/veonim/user-menu.png)

### custom task menus
![](https://veonim.github.io/veonim/tasks.png)

### color support
![](https://veonim.github.io/veonim/colors.png)

### vim command line
![](https://veonim.github.io/veonim/cmdline.png)

### notifications
![](https://veonim.github.io/veonim/echo.png)

### nyan cat
![](https://veonim.github.io/veonim/nyan.png)

## similar projects

the great neovim team have allowed the community to build some kick-ass projects. some of the more interesting ones that i'm excited about are:

- [oni](https://github.com/onivim/oni)
- [gonvim](https://github.com/dzhou121/gonvim)

## development

install dependencies and start automagic watch build and live reload instance

```
npm i
npm start
```

### neovim configuration

when starting the development build of veonim (via `npm start`) the app is configured to load configurations from a local folder instead of the default `XDG_CONFIG_HOME` location. in other words, pretend this is your `~/.config` folder when running veonim in dev mode.

for example, place/copy your neovim configurations **relative to the veonim source folder**
- `./xdg_config/nvim/init.vim` - init.vim
- `./xdg_config/nvim/colors/gruvbox.vim` - colors

veonim will also download and install neovim plugins and veonim extensions to this local dev config folder.

if the folder does not exist, an empty one will be created. the default veonim configurations will be used (same configurations that would apply if no `~/.config`/`XDG_CONFIG_HOME` folder existed)

### release build

build with release configuration

```
npm run build
```

test it out
```
npm run start:release
```

### creating releases

travis/appveyor will publish new github releases on tags

you can use npm to upversion package.json and create a tag:
- `npm version patch`
- `npm version minor`
- `npm version major`

or manually create tag (note that the package release version is lifted from package.json)

`git tag v0.8.0-alpha.1`

then push the git tag

`git push origin v0.8.0-alpha.1`

to create a local release package for your current operating system:

`npm run release`

you will find various binaries available for testing under `dist` folder
