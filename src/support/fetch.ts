import { RequestOptions, IncomingMessage } from 'http'

interface FetchOptions extends RequestOptions {
  data?: any
}

export const fetchStream = (url: string, options = { method: 'GET' } as FetchOptions) => new Promise((done, fail) => {
  const { data, ...requestOptions } = options
  const opts = { ...require('url').parse(url), ...requestOptions }

  const req = require(url.startsWith('https://') ? 'https' : 'http').request(opts, (res: IncomingMessage) => done(res.statusCode! >= 300 && res.statusCode! < 400
    ? fetchStream(res.headers.location!, options)
    : res))

  req.on('error', fail)
  if (data) req.write(data)
  req.end()
})
