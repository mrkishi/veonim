const { join } = require('path')

const NotifyKind = {
  System: 'system',
  Success: 'success',
}

const EXT_PATH = '/ext'

const setup = ({ getDirsPaths = [], existsPaths = [] } = {}) => {
  const mockExistPaths = new Set(existsPaths)
  const mockDirsPaths = getDirsPaths.slice()
  const mockLoadExt = jest.fn()
  const mockNotifications = jest.fn()
  const mockNoop = () => {}
  const mockRemovePath = jest.fn()
  const mockNotifyKind = NotifyKind
  const mockExtPath = EXT_PATH

  jest.mock('fs-extra', () => ({
    remove: mockRemovePath,
  }))

  jest.mock('../../build/support/download', () => ({
    downloadRepo: () => Promise.resolve(true),
  }))

  jest.mock('../../build/support/utils', () => ({
    readFile: mockNoop,
    watchPathSymlink: mockNoop,
    exists: path => Promise.resolve(mockExistPaths.has(path)),
    getDirs: () => Promise.resolve(mockDirsPaths)
  }))

  jest.mock('../../build/core/extensions', () => ({
    EXT_PATH: mockExtPath,
    load: mockLoadExt,
  }))

  jest.mock('../../build/ui/notifications', () => ({
    notify: mockNotifications,
    NotifyKind: mockNotifyKind,
  }))

  const me = require('../../build/support/manage-extensions')

  return {
    module: me.default,
    removed: mockRemovePath,
    notify: mockNotifications,
    loadExtensions: mockLoadExt,
  }
}

const configLines = [
  `VeonimExt 'veonim/ext-json'`,
  `VeonimExt 'veonim/ext-html'`,
]

describe('manage extensions', () => {
  test('download & install success', async () => {
    const { module, notify, loadExtensions, removed } = setup()
    await module(configLines)

    // to contain number of processed extensions in the message
    expect(notify.mock.calls[0][0]).toContain(2)
    expect(notify.mock.calls[0][1]).toEqual(NotifyKind.System)
    expect(notify.mock.calls[1][0]).toContain(2)
    expect(notify.mock.calls[1][1]).toEqual(NotifyKind.Success)

    expect(removed).not.toHaveBeenCalled()
    expect(loadExtensions).toHaveBeenCalled()
  })

  test('no extensions found', async () => {
    const { module, notify, loadExtensions, removed } = setup()
    await module([])

    expect(notify).not.toHaveBeenCalled()
    expect(removed).not.toHaveBeenCalled()
    expect(loadExtensions).not.toHaveBeenCalled()
  })

  test('existing extensions', async () => {
    const { module, notify, loadExtensions, removed } = setup({
      existsPaths: [
        join(EXT_PATH, 'veonim-ext-json'),
        join(EXT_PATH, 'veonim-ext-html'),
      ]
    })
    await module(configLines)

    expect(notify).not.toHaveBeenCalled()
    expect(removed).not.toHaveBeenCalled()
    expect(loadExtensions).not.toHaveBeenCalled()
  })

  test.only('1 new + 1 to be removed', async () => {
    const { module, notify, loadExtensions, removed } = setup({
      getDirsPaths: [ join(EXT_PATH, 'veonim-ext-json') ]
    })

    await module(configLines.slice(1))

    expect(removed.mock.calls[0][0]).toEqual('woops')
    expect(notify.mock.calls[0][0]).toContain(1)
    expect(loadExtensions).toHaveBeenCalled()
  })
})
