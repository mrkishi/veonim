const { src, same } = require('../util')

const api = src('vscode/api')

describe('vscode api - tasks', () => {
  describe('var', () => {
    it('taskExecutions')
  })

  describe('events', () => {
    it('onDidEndTask')
    it('onDidEndTaskProcess')
    it('onDidStartTask')
    it('onDidStartTaskProcess')
  })

  describe('func', () => {
    it('executeTask')
    it('fetchTasks')
    it('registerTaskProvider')
  })
})
