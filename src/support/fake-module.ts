import { hasUpperCase, is } from '../support/utils'
import * as mock from 'mock-require'

const objDeepGet = (obj: object) => (givenPath: string | string[]) => {
  const path = typeof givenPath === 'string' ? givenPath.split('.') : givenPath.slice()

  const dive = (obj = {} as any): any => {
    const pathPoint = path.shift()
    if (pathPoint == null) return
    const val = Reflect.get(obj, pathPoint)
    if (val === undefined) return
    return path.length ? dive(val) : val
  }

  return dive(obj)
}

export default (moduleName: string, fakeImplementation: any, onMissing?: (name: string, path: string) => void) => {
  const getFake = objDeepGet(fakeImplementation)
  const notifyOfMissingPath = (path: string) => is.function(onMissing) && onMissing!(moduleName, path)

  const fake = (path = [] as string[]): any => new Proxy({}, { get: (_, key: string) => {
    const objPath = [ ...path, key ]
    const found = getFake(objPath)

    if (found) return found
    else notifyOfMissingPath(objPath.join('.'))

    if (hasUpperCase(key[0])) return class Anon {}
    return fake(objPath)
  } })

  mock(moduleName, fake())
}
