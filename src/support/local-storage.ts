import { fromJSON } from '../support/utils'

export const setItem = (key: string, value: any) => localStorage.setItem(key, JSON.stringify(value))
export const getItem = (key: string, defaultValue = {}) => {
  const raw = localStorage.getItem(key)
  if (!raw) return defaultValue
  return fromJSON(raw).or(defaultValue)
}
