const raw = localStorage.getItem('veonim-trace-flags') || ''
const parsed = raw.split(',').filter(m => m)
const traceFlags = new Set(parsed)

traceFlags.size && console.log(
  'tracing has been enabled for flags:',
  [...traceFlags],
  'set console log level to "DEBUG" to see trace logs',
)

export default (name: string) => (...msg: any[]) => traceFlags.has(name) && console.debug(...msg) 
