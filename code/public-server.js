const fs = require('fs')
const http = require('http')
const path = require('path')

const loadEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) return

  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const separator = line.indexOf('=')
    if (separator < 1) continue

    const key = line.slice(0, separator).trim()
    let value = line.slice(separator + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = value
  }
}

loadEnvFile(path.resolve(__dirname, '.env.local'))

const port = Number(process.env.PORT || 8081)
const distRoot = path.resolve(__dirname, 'dist')
const routes = [
  { prefix: '/api', target: process.env.BACKEND_PROXY_TARGET || 'http://localhost:8080' },
  { prefix: '/evaluate', target: process.env.ML_PROXY_TARGET || 'http://localhost:5000' },
  { prefix: '/storage', target: process.env.CASE_ASSET_PROXY_TARGET || 'http://localhost:333' },
]

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

const sendServiceUnavailable = (response) => {
  if (response.headersSent) {
    response.destroy()
    return
  }

  response.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' })
  response.end('Сервис временно недоступен')
}

const proxyRequest = (request, response, targetValue) => {
  const target = new URL(targetValue)
  const upstream = http.request(
    {
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || 80,
      method: request.method,
      path: request.url,
      headers: {
        ...request.headers,
        host: target.host,
      },
    },
    (upstreamResponse) => {
      response.writeHead(upstreamResponse.statusCode || 502, upstreamResponse.headers)
      upstreamResponse.pipe(response)
    }
  )

  upstream.setTimeout(120000, () => upstream.destroy(new Error('Upstream timeout')))
  upstream.on('error', (error) => {
    console.error(`Proxy request failed: ${request.method} ${request.url}: ${error.message}`)
    sendServiceUnavailable(response)
  })
  request.on('aborted', () => upstream.destroy())
  request.pipe(upstream)
}

const serveFile = (request, response, filePath) => {
  const extension = path.extname(filePath).toLowerCase()
  const headers = {
    'Content-Type': mimeTypes[extension] || 'application/octet-stream',
    'X-Content-Type-Options': 'nosniff',
  }

  if (extension === '.html') {
    headers['Cache-Control'] = 'no-store'
  } else {
    headers['Cache-Control'] = 'public, max-age=3600'
  }

  response.writeHead(200, headers)
  if (request.method === 'HEAD') {
    response.end()
    return
  }
  fs.createReadStream(filePath).pipe(response)
}

const serveFrontend = (request, response, pathname) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(404)
    response.end()
    return
  }

  let decodedPath
  try {
    decodedPath = decodeURIComponent(pathname)
  } catch {
    response.writeHead(400)
    response.end()
    return
  }

  const relativePath = decodedPath === '/' ? 'index.html' : decodedPath.replace(/^\/+/, '')
  const candidate = path.resolve(distRoot, relativePath)
  const isInsideDist = candidate === distRoot || candidate.startsWith(`${distRoot}${path.sep}`)

  if (!isInsideDist) {
    response.writeHead(403)
    response.end()
    return
  }

  fs.stat(candidate, (error, stats) => {
    if (!error && stats.isFile()) {
      serveFile(request, response, candidate)
      return
    }

    serveFile(request, response, path.join(distRoot, 'index.html'))
  })
}

if (!fs.existsSync(path.join(distRoot, 'index.html'))) {
  console.error('Production build not found. Run `npm run build` first.')
  process.exit(1)
}

http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname
  const route = routes.find(({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`))

  if (route) {
    proxyRequest(request, response, route.target)
    return
  }

  serveFrontend(request, response, pathname)
}).listen(port, '0.0.0.0', () => {
  console.log(`AlfaCaseBot is available on port ${port}`)
})
