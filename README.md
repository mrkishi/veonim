![](https://veonim.github.io/veonim/header.png)

veonim is a modern lightweight modal IDE built on neovim. my goal is to create my ideal programming environment

![](https://veonim.github.io/veonim/smart.png)

## features

- cross platform (and no external dependencies needed - everything comes bundled)
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
- built-in statusline
- color picker + live vim colorscheme editing
- (experimental) parse :term output and display problems in editor
- veonim extension support
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

- [oni](https://github.com/dzhou121/gonvim)
- [gonvim](https://github.com/onivim/oni)

## development

install dependencies and start automagic watch build and live reload instance

```
npm i
npm start
```

some of the npm scripts may only work on macOS and linux. windows should get its act together.

### building for your target platform

after `npm install` pick and run one of the release targets listed below. it is unlikely that cross-compiling will work.

```
npm run release-mac
npm run release-win
npm run release-linux
```
