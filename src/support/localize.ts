import { fromJSON, readFile } from '../support/utils'

const localize = (lang: any) => (value: string) => {
  const [ /*match*/, key = '' ] = value.match(/^%(.*?)%$/) || []
  console.log('key', key)
  return Reflect.get(lang, key)
}

export const setupLocalize = async (languageFilePath: string) => {
  const languageRaw = await readFile(languageFilePath)
  const languageData = fromJSON(languageRaw).or({})
  return localize(languageData)
}
