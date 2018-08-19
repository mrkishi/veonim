const { src, same } = require('./util')
const m = src('support/utils')

const nix = process.platform === 'linux' || process.platform === 'darwin'

if (nix) {

describe('path parts', () => {
  it('root path', () => {
    const testpath = '/Users/a/veonim'
    const res = m.pathParts(testpath)
    same(res, ['/', 'Users', 'a', 'veonim'])
  })

  it('relative dot path', () => {
    const testpath = './Users/a/veonim/'
    const res = m.pathParts(testpath)
    same(res, ['Users', 'a', 'veonim'])
  })

  it('relative path', () => {
    const testpath = 'a/veonim/'
    const res = m.pathParts(testpath)
    same(res, ['a', 'veonim'])
  })

  it('path segments', () => {
    const testpath = '/Users/a/../'
    const res = m.pathParts(testpath)
    same(res, ['/', 'Users'])
  })
})

}
