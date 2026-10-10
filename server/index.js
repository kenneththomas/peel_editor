import express from 'express'
import cors from 'cors'
import path from 'node:path'
import fs from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { tmpdir } from 'node:os'
import { randomUUID, timingSafeEqual } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { resolveAllowedPath } from './fileAccess.js'

const execute = promisify(execFile)
const extensions = new Set(['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'])
const types = { '.mp4': 'video/mp4', '.webm': 'video/webm', '.ogg': 'video/ogg', '.mov': 'video/quicktime', '.avi': 'video/x-msvideo', '.mkv': 'video/x-matroska' }
const fail = (message, status = 400) => Object.assign(new Error(message), { status })
const route = handler => (req, res, next) => Promise.resolve(handler(req, res)).catch(next)

export async function createApp({ roots = [], token = '', origins = ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'] } = {}) {
  const allowedRoots = await Promise.all(roots.map(async root => {
    if (!path.isAbsolute(root)) throw new Error('PEEL_VIDEO_ROOTS must contain absolute paths')
    const canonical = await fs.realpath(root)
    if (!(await fs.stat(canonical)).isDirectory()) throw new Error('Video roots must be directories')
    return canonical
  }))
  const app = express()
  const files = new Map()
  app.disable('x-powered-by')
  app.use((req, res, next) => {
    if (req.headers.origin && !origins.includes(req.headers.origin)) return res.status(403).json({ error: 'Origin is not allowed' })
    res.setHeader('Referrer-Policy', 'no-referrer')
    res.setHeader('Cache-Control', 'no-store')
    next()
  })
  app.use(cors({ origin: origins }))
  app.use(express.json({ limit: '64kb' }))
  app.get('/api/health', (req, res) => res.json({ status: 'ok', configured: Boolean(token && allowedRoots.length) }))
  const authorize = (req, res, next) => {
    const supplied = Buffer.from(req.headers.authorization || '')
    const expected = Buffer.from(`Bearer ${token}`)
    if (!token || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return res.status(401).json({ error: 'Enter the backend access token configured with PEEL_API_TOKEN' })
    next()
  }
  async function videoPath(input) {
    const fullPath = await resolveAllowedPath(input, allowedRoots)
    if (!extensions.has(path.extname(fullPath).toLowerCase()) || !(await fs.stat(fullPath)).isFile()) throw fail('Path is not a supported video')
    return fullPath
  }
  app.post('/api/videos/list', authorize, route(async (req, res) => {
    const folder = await resolveAllowedPath(req.body.folderPath, allowedRoots)
    if (!(await fs.stat(folder)).isDirectory()) throw fail('Path is not a directory')
    const videos = []
    async function walk(directory) {
      for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
        const fullPath = path.join(directory, entry.name)
        if (entry.isSymbolicLink()) continue
        if (entry.isDirectory()) await walk(await resolveAllowedPath(fullPath, allowedRoots))
        else if (entry.isFile() && extensions.has(path.extname(entry.name).toLowerCase())) {
          const canonical = await videoPath(fullPath)
          const stats = await fs.stat(canonical)
          const id = randomUUID()
          files.set(id, { path: canonical, expires: Date.now() + 86400000 })
          videos.push({ id, name: entry.name, path: path.relative(folder, canonical).replaceAll('\\', '/'), fullPath: canonical, size: stats.size, modified: stats.mtime.toISOString() })
        }
      }
    }
    for (const [id, file] of files) if (file.expires < Date.now()) files.delete(id)
    await walk(folder)
    res.json({ videos })
  }))
  // Native video elements stream through an expiring capability, never a raw path.
  app.get('/api/videos/file', route(async (req, res) => {
    const file = files.get(req.query.id)
    if (!file || file.expires < Date.now()) throw fail('Reload the folder to refresh this video', 404)
    const fullPath = await videoPath(file.path)
    const { size } = await fs.stat(fullPath)
    let start = 0, end = size - 1
    if (req.headers.range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range)
      if (!match || (!match[1] && !match[2])) return res.status(416).set('Content-Range', `bytes */${size}`).end()
      if (!match[1]) start = Math.max(0, size - Number(match[2]))
      else { start = Number(match[1]); if (match[2]) end = Math.min(end, Number(match[2])) }
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size) return res.status(416).set('Content-Range', `bytes */${size}`).end()
      res.status(206).set('Content-Range', `bytes ${start}-${end}/${size}`)
    }
    res.set({ 'Accept-Ranges': 'bytes', 'Content-Type': types[path.extname(fullPath).toLowerCase()], 'Content-Length': size ? end - start + 1 : 0 })
    if (!size) return res.end()
    const stream = createReadStream(fullPath, { start, end })
    res.on('close', () => stream.destroy())
    stream.on('error', () => res.destroy())
    stream.pipe(res)
  }))
  app.delete('/api/videos/delete', authorize, route(async (req, res) => {
    const fullPath = await videoPath(req.body.filePath)
    await fs.unlink(fullPath)
    for (const [id, file] of files) if (file.path === fullPath) files.delete(id)
    res.json({ success: true })
  }))
  app.post('/api/videos/stitch', authorize, route(async (req, res) => {
    if (!Array.isArray(req.body.filePaths) || req.body.filePaths.length < 2 || req.body.filePaths.length > 100) throw fail('Select between 2 and 100 videos')
    const inputs = await Promise.all(req.body.filePaths.map(videoPath))
    const directory = await fs.mkdtemp(path.join(tmpdir(), 'peel-stitch-'))
    const list = path.join(directory, 'inputs.txt'), output = path.join(directory, 'output.mp4')
    const cleanup = () => fs.rm(directory, { recursive: true, force: true }).catch(console.error)
    try {
      await fs.writeFile(list, inputs.map(input => `file '${input.replaceAll('\\', '/').replaceAll("'", "'\\''")}'`).join('\n'))
      const args = ['-y', '-f', 'concat', '-safe', '0', '-i', list]
      try { await execute('ffmpeg', [...args, '-c', 'copy', output], { timeout: 600000 }) }
      catch { await execute('ffmpeg', [...args, '-c:v', 'libx264', '-c:a', 'aac', '-preset', 'fast', '-crf', '23', output], { timeout: 600000 }) }
      res.download(output, 'stitched.mp4', async error => {
        await cleanup()
        if (error && !res.headersSent) res.status(500).json({ error: 'Unable to download stitched video' })
      })
    } catch {
      await cleanup()
      throw fail('Stitching failed. Check that FFmpeg is installed and the clips are compatible.', 500)
    }
  }))
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error)
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Video operation failed' })
  })
  return app
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const roots = (process.env.PEEL_VIDEO_ROOTS || '').split(path.delimiter).filter(Boolean)
  const origins = process.env.PEEL_UI_ORIGINS?.split(',').filter(Boolean)
  const app = await createApp({ roots, token: process.env.PEEL_API_TOKEN || '', ...(origins ? { origins } : {}) })
  app.listen(process.env.PORT || 3001, '127.0.0.1', () => console.log('Peel video backend listening on localhost. Configure PEEL_VIDEO_ROOTS and PEEL_API_TOKEN to enable file access.'))
}
