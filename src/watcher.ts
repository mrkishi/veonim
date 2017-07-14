export default class Watcher extends Map<string, Set<Function>> {
  constructor() {
    super()
  }

  add(event: string, handler: Function) {
    const handlers = this.get(event)
    if (!handlers || !handlers.size) this.set(event, new Set<Function>([ handler ]))
    else handlers.add(handler)
  }

  notify(event: string, ...args: any[]) {
    const handlers = this.get(event)
    if (!handlers || !handlers.size) return
    handlers.forEach(cb => cb(...args))
  }

  remove(event: string, handler: Function) {
    const handlers = this.get(event)
    if (!handlers || !handlers.size) return
    handlers.delete(handler)
  }
}
