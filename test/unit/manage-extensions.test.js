const { join, normalize } = require('path')

const NotifyKind = {
  System: 'system',
  Success: 'success',
}

const EXT_PATH = normalize('/ext')

const setup = ({ getDirsPaths = [], existsPaths = [] } = {}) => {
  const mockExistPaths = new Set(existsPaths)
  const mockDirsPaths = getDirsPaths.slice()
  const mockLoadExt = jest.fn()
  const mockNotifications = jest.fn()
  const mockNoop = () => {}
  const mockRemovePath = jest.fn()
  const mockNotifyKind = NotifyKind
  const mockExtPath = EXT_PATH
  const mockDownload = jest.fn(() => Promise.resolve(true))

  jest.resetModules()

  jest.mock('fs-extra', () => ({
    remove: mockRemovePath,
  }), {
    virtual: true,
  })

  jest.mock('../../build/support/download', () => ({
    downloadRepo: mockDownload,
  }))

  jest.mock('../../build/support/utils', () => ({
    readFile: mockNoop,
    watchPathSymlink: mockNoop,
    is: { string: val => typeof val === 'string' },
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
    download: mockDownload,
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
    const { module, notify, loadExtensions, removed, download } = setup()
    await module(configLines)

    // to contain number of processed extensions in the message
    expect(notify.mock.calls[0][0]).toContain(2)
    expect(notify.mock.calls[0][1]).toEqual(NotifyKind.System)
    expect(notify.mock.calls[1][0]).toContain(2)
    expect(notify.mock.calls[1][1]).toEqual(NotifyKind.Success)

    expect(download.mock.calls[0]).toEqual([{
      user: 'veonim',
      repo: 'ext-json',
      destination: normalize('/ext'),
    }])
    expect(download.mock.calls[1]).toEqual([{
      user: 'veonim',
      repo: 'ext-html',
      destination: normalize('/ext'),
    }])
    expect(removed).not.toHaveBeenCalled()
    expect(loadExtensions).toHaveBeenCalled()
  })

  test('no extensions found', async () => {
    const { module, notify, loadExtensions, removed, download } = setup()
    await module([])

    expect(download).not.toHaveBeenCalled()
    expect(notify).not.toHaveBeenCalled()
    expect(removed).not.toHaveBeenCalled()
    expect(loadExtensions).not.toHaveBeenCalled()
  })

  test('existing extensions', async () => {
    const { module, notify, loadExtensions, removed, download } = setup({
      existsPaths: [
        join(EXT_PATH, 'ext-json-master'),
        join(EXT_PATH, 'ext-html-master'),
      ]
    })

    await module(configLines)

    expect(download).not.toHaveBeenCalled()
    expect(notify).not.toHaveBeenCalled()
    expect(removed).not.toHaveBeenCalled()
    expect(loadExtensions).not.toHaveBeenCalled()
  })

  test('1 new + 1 to be removed', async () => {
    const { module, notify, loadExtensions, removed, download } = setup({
      getDirsPaths: [
        { name: 'ext-json-master', path: join(EXT_PATH, 'ext-json-master') },
      ]
    })

    await module(configLines.slice(1))

    expect(download.mock.calls[0]).toEqual([{
      user: 'veonim',
      repo: 'ext-html',
      destination: normalize('/ext'),
    }])
    expect(removed.mock.calls[0][0]).toEqual(normalize('/ext/ext-json-master'))
    expect(notify.mock.calls[0][0]).toContain(1)
    expect(loadExtensions).toHaveBeenCalled()
  })

  test('bad config lines', async () => {
    const { module, notify, loadExtensions, removed, download } = setup()

    await module(['VeonimExt lolumad?'])

    expect(download).not.toHaveBeenCalled()
    expect(notify).not.toHaveBeenCalled()
    expect(removed).not.toHaveBeenCalled()
    expect(loadExtensions).not.toHaveBeenCalled()
  })
})
