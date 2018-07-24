// TODO: type the request options
export const stream = (url: string, options = { method: 'GET' }) => new Promise((done, fail) => {
  const { data, ...requestOptions } = options
  const opts = { ...require('url').parse(url), ...requestOptions }

  const req = require(url.startsWith('https://') ? 'https' : 'http').request(opts, res => done(res.statusCode >= 300 && res.statusCode < 400
    ? stream(res.headers.location, options)
    : res))

  req.on('error', fail)
  if (data) req.write(data)
  req.end()
})
