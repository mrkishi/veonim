const { src, same } = require('../util')

describe('vscode api - env', () => {
  let env

  beforeEach(() => {
    env = src('vscode/env').default
  })

  describe('var', () => {
    it('appName', () => {
      same(env.appName, 'Veonim')
    })

    it('appRoot', () => {
      same(env.appRoot, process.cwd())
    })

    it('language', () => {
      same(env.language, 'en-US')
    })

    it('machineId', () => {
      same(env.machineId, require('os').hostname())
    })

    it('sessionId', () => {
      const includesName = env.sessionId.includes('Veonim-')
      same(includesName, true, 'sessionId starts with Veonim-')
    })
  })
})
