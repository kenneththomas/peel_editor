// Manual UI verification on an isolated origin. No paid provider calls.
// node tests/mock-preview.js, then visit http://127.0.0.1:5175.
// Use key "local-test" and endpoint http://127.0.0.1:5191/images in Settings.
import http from 'node:http'
import { createServer } from 'vite'

const image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5foAAAAASUVORK5CYII='
const mock = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:5175')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }
  if (req.method !== 'POST' || req.url !== '/images') { res.writeHead(404); res.end(); return }
  req.resume()
  req.on('end', () => setTimeout(() => {
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ data: [{ b64_json: image, media_type: 'image/png' }] }))
  }, 1200))
})
mock.listen(5191, '127.0.0.1')
const vite = await createServer({ server: { port: 5175, host: '127.0.0.1', open: false, strictPort: true } })
await vite.listen()
console.log('Isolated test UI: http://127.0.0.1:5175; mock image API: http://127.0.0.1:5191/images')
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await vite.close(); mock.close(); process.exit(0) })
