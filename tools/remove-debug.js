'use strict'

module.exports = ({ source }, { jscodeshift: j }) => j(source)
  .find(j.IfStatement)
  .forEach(path => {
    try {
      const m = path.value.test
      if (m.object.object.name === 'process' 
        && m.object.property.name === 'env' 
        && m.property.name === 'VEONIM_DEV'
      ) path.replace()
    } catch(e) {}
  })
  .toSource()

// run with jscodeshift (npm i -g jscodeshift)
// jscodeshift -t cleaner.js main.js another.js
// or a folder
// jscodeshift -t cleaner.js src
// dry run:
// append args: -d -p
