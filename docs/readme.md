# docs

here come dat docs boi. ayyy lmao

## quick start

veonim does not come with all IDE features bundled in. i know, this may hurt you on a deep emotional level, but bundling everything in is not the vim way.

IDE support must be enabled via extensions and `init.vim` configuration.

it is recommended to wrap all veonim configuration in an `exists` block so that your init.vim remains compatible with neovim/vim.

```vim
if exists('veonim')
...sunshine and rainbows...
endif
```

(in the future we may provide an optional "everything-bundled-together" install for a completely portable installation - useful when network connectivity is not great, behind corporate firewalls, etc.)

## design goals

the design goal of veonim is to try to leverage as much existing technologies as possible and stay true to the nature of vim. this means a few things:
- the intent is to stay true to the nature of vim. for example we defer window/tab management to vim instead of creating our own system.
- veonim is keyboard driven only. there is no mouse support, but some primitive support might be added
- configuration is done the vim way: this means all user config happens in the `init.vim` with vimscript/lua, remote plugins (any language), or msgpack-rpc api
- veonim provides a few set of primitives (commands/functions) and it is up to the user to construct their ideal workflow. some common/suggested "recipes" may be provided for common workflows - but really, the sky is the limit
- extensions are written with the vscode api. veonim does not aim to be 100% compatible with the vscode api. some vscode api features may not even make sense in the veonim world. veonim will attempt to maintain a level of compatibility with the vscode api that ensures "essential" plugins (like language-server extensions, etc.) are supported. (this can change depending on project popularity, feature priority, additional project contributors, etc.)
- language support is provided via language-servers (https://langserver.org). technically veonim is compatible with any programming language that has a language server, however the language server will need to be loaded from a vscode extension. not all language servers have a vscode extension, but we can change that (see language support below)

## language support
language support is provided via language-servers (https://langserver.org). technically veonim is compatible with any programming language that has a language server, however the language server will need to be loaded from a vscode extension. not all language servers have a vscode extension, but we can change that (see language support below).

the following languages are "verified" to be working with veonim. more will be verified soon + as demanded.

- typescript 
- javascript
- html
- json
- css

### installing language support extensions
as mentioned above, language support must be provided via a language server wrapped in a vscode extension. 

