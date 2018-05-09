import Worker from '../messaging/worker'

// TODO: do we still need the global extension interfaces?
export interface LanguageServer {
  sendNotification: (method: string, ...params: any[]) => void,
  sendRequest: (method: string, ...params: any[]) => Promise<any>,
  onNotification: (method: string, cb: (...args: any[]) => void) => void,
  onRequest: (method: string, cb: (...args: any[]) => Promise<any>) => void,
  onError: (cb: (err: any) => void) => void,
  onClose: (cb: (err: any) => void) => void,
}

const { on, call, request } = Worker('extension-host')

export const load = () => call.load()
export const existsForLanguage = (language: string) => request.existsForLanguage(language)

export const activate = {
  language: async (language: string): Promise<LanguageServer> => {
    const serverId = await request.activate({ kind: 'language', data: language })
    if (!serverId) throw new Error(`was not able to start language server for ${language}`)

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

    const onRequest = (method: string, cb: (...args: any[]) => Promise<any>) => {
      call.server_onRequest({ serverId, method })
      on[`${serverId}:${method}`]((...args: any[]) => cb(...args))
    }

    const onError = (cb: (err: any) => void) => {
      call.server_onError({ serverId })
      on[`${serverId}:onError`]((err: any) => cb(err))
    }

    const onClose = (cb: (err: any) => void) => {
      call.server_onExit({ serverId })
      on[`${serverId}:onClose`]((err: any) => cb(err))
    }

    return { sendNotification, sendRequest, onNotification, onRequest, onError, onClose }
  }
}
