const setup = () => {
  const mockLoadExt = jest.fn()
  const mockNotifications = jest.fn()
  const mockNoop = () => {}

  jest.mock('../../build/support/download', () => ({
    downloadRepo: () => Promise.resolve(true),
  }))

  jest.mock('../../build/support/utils', () => ({
    // TODO: allow custom behavior
    exists: () => Promise.resolve(true),
    readFile: mockNoop,
    watchPathSymlink: mockNoop,
  }))

  jest.mock('../../build/core/extensions', () => ({
    EXT_PATH: '/Users/vader/.config/veonim/extensions',
    load: mockLoadExt,
  }))

  jest.mock('../../build/ui/notifications', () => ({
    notify: mockNotifications,
    NotifyKind: {
      System: 'system',
      Success: 'success',
    }
  }))

  const me = require('../../build/support/manage-extensions')

  return {
    notify: mockNotifications.mock,
    module: me.default,
    loadExtensions: mockLoadExt,
  }
}

const configLines = [
  `VeonimExt 'veonim/ext-json'`,
  `VeonimExt 'veonim/ext-html'`,
]

process.on('unhandledRejection', console.error)

describe('manage extensions', () => {
  test('download & install success', async () => {
    const { module, notify, loadExtensions } = setup()
    await module(configLines)

    expect(notify.calls[0][0]).toEqual('Found 2 Veonim extensions. Installing...')
    expect(notify.calls[0][1]).toEqual('system')
    expect(notify.calls[1][0]).toEqual('Installed 2 Veonim extensions!')
    expect(notify.calls[1][1]).toEqual('success')

    expect(loadExtensions).toHaveBeenCalled()
  })
})
