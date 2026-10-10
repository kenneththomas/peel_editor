import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { once } from 'node:events'
import { resolveAllowedPath, isWithinRoot } from '../server/fileAccess.js'
import { createApp } from '../server/index.js'

test('video access requires authorization and a canonical allowed root', async t => {
  const fixture = await fs.mkdtemp(path.join(os.tmpdir(), 'peel-access-test-'))
  const root = path.join(fixture, 'videos'), outside = path.join(fixture, 'videos-other')
  await fs.mkdir(root); await fs.mkdir(outside)
  const clip = path.join(root, 'clip.mp4'), privateClip = path.join(outside, 'private.mp4')
  await fs.writeFile(clip, '0123456789'); await fs.writeFile(privateClip, 'private')
  t.after(async () => {
    assert.ok(isWithinRoot(os.tmpdir(), fixture))
    await fs.rm(fixture, { recursive: true, force: true })
  })
  assert.equal(isWithinRoot(root, outside), false)
  assert.equal(await resolveAllowedPath(clip, [root]), await fs.realpath(clip))
  await assert.rejects(resolveAllowedPath(privateClip, [root]), { status: 403 })
  await assert.rejects(resolveAllowedPath(path.join(root, '..', 'videos-other', 'private.mp4'), [root]), { status: 403 })
  await assert.rejects(resolveAllowedPath('clip.mp4', [root]), { status: 400 })
  await assert.rejects(resolveAllowedPath(clip, []), { status: 403 })
  const link = path.join(root, 'escape')
  await fs.symlink(outside, link, process.platform === 'win32' ? 'junction' : 'dir')
  await assert.rejects(resolveAllowedPath(path.join(link, 'private.mp4'), [root]), { status: 403 })

  const app = await createApp({ roots: [root], token: 'test-access-token' })
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  t.after(() => new Promise(resolve => server.close(resolve)))
  const url = `http://127.0.0.1:${server.address().port}`
  const call = (route, body, extra = {}) => fetch(url + route, {
    method: route.includes('delete') ? 'DELETE' : 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-access-token', ...extra }, body: JSON.stringify(body),
  })
  assert.equal((await call('/api/videos/list', { folderPath: root }, { Authorization: '' })).status, 401)
  assert.equal((await call('/api/videos/list', { folderPath: root }, { Origin: 'https://untrusted.example' })).status, 403)
  assert.equal((await call('/api/videos/list', { folderPath: outside })).status, 403)
  const listed = await call('/api/videos/list', { folderPath: root })
  assert.equal(listed.status, 200)
  const { videos } = await listed.json()
  assert.equal(videos.length, 1)
  assert.equal((await fetch(`${url}/api/videos/file?filePath=${encodeURIComponent(privateClip)}`)).status, 404)
  const streamed = await fetch(`${url}/api/videos/file?id=${videos[0].id}`, { headers: { Range: 'bytes=2-5' } })
  assert.equal(streamed.status, 206)
  assert.equal(streamed.headers.get('content-range'), 'bytes 2-5/10')
  assert.equal(await streamed.text(), '2345')
  assert.equal((await fetch(`${url}/api/videos/file?id=${videos[0].id}`, { headers: { Range: 'bytes=20-' } })).status, 416)
  assert.equal((await call('/api/videos/delete', { filePath: privateClip })).status, 403)
  assert.equal(await fs.readFile(privateClip, 'utf8'), 'private')
  assert.equal((await call('/api/videos/stitch', { filePaths: [clip, privateClip] })).status, 403)
  assert.equal((await call('/api/videos/delete', { filePath: clip }, { Authorization: '' })).status, 401)
  assert.equal((await call('/api/videos/delete', { filePath: clip })).status, 200)
  assert.equal((await fetch(`${url}/api/videos/file?id=${videos[0].id}`)).status, 404)
})
