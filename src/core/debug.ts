import Worker from '../messaging/worker'

export interface DebugAdapter {
  sendNotification: (method: string, ...params: any[]) => void
  sendRequest: (method: string, ...params: any[]) => Promise<any>
  onNotification: (method: string, cb: (...args: any[]) => void) => void
  onRequest: (method: string, cb: (...args: any[]) => Promise<any>) => void
  onError: (cb: (err: any) => void) => void
  onClose: (cb: (err: any) => void) => void
}

const { on, call, request } = Worker('debug-host')

// TODO: accept and send more parameters for startDebug?
// who decides what filetypes match to debug adapters?
export const startDebug = async (adapter: string): Promise<DebugAdapter> => {
    const adapterId = await request.startDebug(adapter)
    if (!adapterId) throw new Error(`was not able to start debug adapter for ${adapter}`)

    const sendNotification = (method: string, ...params: any[]) => {
      call.server_sendNotification({ adapterId, method, params })
    }

    const sendRequest = (method: string, ...params: any[]) => {
      return request.server_sendRequest({ adapterId, method, params })
    }

    const onNotification = (method: string, cb: (...args: any[]) => void) => {
      call.server_onNotification({ adapterId, method })
      on[`${adapterId}:${method}`]((args: any[]) => cb(...args))
    }

    const onRequest = (method: string, cb: (...args: any[]) => Promise<any>) => {
      call.server_onRequest({ adapterId, method })
      on[`${adapterId}:${method}`]((args: any[]) => cb(...args))
    }

    const onError = (cb: (err: any) => void) => {
      call.server_onError({ adapterId })
      on[`${adapterId}:onError`]((err: any) => cb(err))
    }

    const onClose = (cb: (err: any) => void) => {
      call.server_onExit({ adapterId })
      on[`${adapterId}:onClose`]((err: any) => cb(err))
    }

    return { sendNotification, sendRequest, onNotification, onRequest, onError, onClose }
}

const test = async () => {
  const dbg = await startDebug('node2')

}

test().catch(console.error)

console.log('loading core.debug')
