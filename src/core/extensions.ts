import { LanguageActivationResult } from '../interfaces/extension'
export { ActivationResultKind } from '../interfaces/extension'
import Worker from '../messaging/worker'

const { request, call } = Worker('extension-host')

export const load = () => call.load()

export const activate = {
  language: (language: string): Promise<LanguageActivationResult> => request.activate({ kind: 'language', data: language })
}
