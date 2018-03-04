![](https://veonim.github.io/veonim/header.png)

Veonim is a Neovim GUI. It has things like pixels and is web scale.

![](https://veonim.github.io/veonim/preview.png)

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
