import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.woff2': 'font/woff2', '.mp4': 'video/mp4',
}

/**
 * The prototypes run sandboxed, with an opaque origin: their third-party scripts (GSAP, three.js
 * from CDNs) can't read this origin's storage, where the PocketBase admin keeps its session.
 * nginx.conf sends the same header for /designs/.
 */
const DESIGNS_CSP = 'sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms allow-modals allow-downloads'

/**
 * designs/ holds the static HTML prototypes the /prototypes gallery shows. This serves the
 * folder at /designs/ in dev (a missing file is a 404, never the app) and copies it into
 * the build, so dist/designs/take.html is /designs/take.html behind nginx too. The folder's
 * own index.html (the old proposals page, which the gallery replaces) stays out of both.
 */
function designs(): Plugin {
  const dir = fileURLToPath(new URL('./designs', import.meta.url))
  const skip = (rel: string) => rel === 'index.html'
  const files = (): string[] =>
    existsSync(dir)
      ? readdirSync(dir, { recursive: true, encoding: 'utf8' }).filter(f => !skip(f) && statSync(join(dir, f)).isFile())
      : []

  return {
    name: 'portfolio-designs',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        if (url.pathname === '/designs') {
          res.statusCode = 301
          res.setHeader('Location', '/designs/' + url.search)
          res.end()
          return
        }
        if (!url.pathname.startsWith('/designs/')) return next()
        let rel: string
        try { rel = decodeURIComponent(url.pathname.slice('/designs/'.length)) } catch { rel = '\0' }
        const file = resolve(dir, rel || 'index.html')
        const inside = file.startsWith(dir + sep) && !relative(dir, file).startsWith('..')
        const target = inside && existsSync(file) && statSync(file).isDirectory() ? join(file, 'index.html') : file
        if (!inside || skip(relative(dir, target)) || !existsSync(target) || !statSync(target).isFile()) {
          res.statusCode = 404
          res.setHeader('Content-Type', 'text/plain; charset=utf-8')
          res.end('Not found')
          return
        }
        res.setHeader('Content-Type', TYPES[extname(target).toLowerCase()] ?? 'application/octet-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Content-Security-Policy', DESIGNS_CSP)
        res.setHeader('X-Robots-Tag', 'noindex')
        res.end(readFileSync(target))
      })
    },
    generateBundle() {
      for (const f of files()) {
        this.emitFile({ type: 'asset', fileName: `designs/${f.split(sep).join('/')}`, source: readFileSync(join(dir, f)) })
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), designs()],
})
