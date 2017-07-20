export const $ = (...fns: Function[]) => (...a: any[]) => fns.reduce((res, fn, ix) => ix ? fn(res) : fn(...res), a)

export function debounce (fn: Function, wait = 1) {
  let timeout: NodeJS.Timer
  return function(this: any, ...args: any[]) {
    const ctx = this
    clearTimeout(timeout)
    timeout = setTimeout(() => fn.apply(ctx, args), wait)
  }
}

export const mergeValid = (target: any, source: any) => Object.keys(source).reduce((tar, key) => {
  const val = Reflect.get(source, key)
  if (val !== null && val !== undefined && val !== '') Reflect.set(tar, key, val)
  return tar
}, target)

export const merge = Object.assign
