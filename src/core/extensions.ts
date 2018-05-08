import { LanguageActivationResult } from '../interfaces/extension'
export { ActivationResultKind } from '../interfaces/extension'
import Worker from '../messaging/worker'

const { on, call, request } = Worker('extension-host')

export const load = () => call.load()

export const activate = {
  language: async (language: string): Promise<LanguageActivationResult> => {
    const { serverId, status } = await request.activate({ kind: 'language', data: language })

    const sendNotification = (method: string, ...params: any[]) => {
      call.server_sendNotification({ serverId, method, params })
    }

    const sendRequest = (method: string, ...params: any[]) => {
      return request.server_sendRequest({ serverId, method, params })
    }

    const onNotification = (method: string, cb: (...args: any[]) => void) => {
      call.server_onNotification({ serverId, method })
      on[`${serverId}:${method}`]((...args: any[]) => cb(...args))
    }

    // const onRequest = (method: string, cb: (...args: any[]) => Promise<any>) => {
    //   call.server_onRequest({ serverId, method })
    // }

    const onError = (cb: (err: any) => void) => {
      call.server_onError({ serverId })
      on[`${serverId}:onError`]((err: any) => cb(err))
    }

    const onClose = (cb: (err: any) => void) => {
      call.server_onExit({ serverId })
      on[`${serverId}:onClose`]((err: any) => cb(err))
    }

    const server = { sendNotification, sendRequest, onNotification, onError, onClose }
    return { status, server }
  }
}
