'use strict'

module.exports = ({ source }, { jscodeshift: j }) => j(source)
  .forEach(path => {
    path.value.program.body.unshift(
      j.variableDeclaration('var', [
        j.variableDeclarator(
          j.identifier('exports'),
          j.objectExpression([]),
        )
      ]))
  })
  .toSource()

// run with jscodeshift (npm i -g jscodeshift)
// jscodeshift -t cleaner.js main.js another.js
// or a folder
// jscodeshift -t cleaner.js src
// dry run:
// append args: -d -p
