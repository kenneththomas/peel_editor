import 'fake-indexeddb/auto'
import test from 'node:test'
import assert from 'node:assert/strict'
import { createGeneration } from '../src/services/generation.js'
import { getSavedImages, saveImage, updateImage, deleteImage, restoreImage, getImageCount, saveGeneration, completeGeneration, getGenerations } from '../src/services/gallery.js'

const values = new Map()
globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }
globalThis.FileReader = class {
  readAsDataURL(blob) {
    blob.arrayBuffer().then(buffer => {
      this.result = `data:${blob.type};base64,${Buffer.from(buffer).toString('base64')}`
      this.onload()
    }).catch(() => this.onerror())
  }
}
const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5foAAAAASUVORK5CYII='

test('library upgrades preserve old images, merge legacy storage, and persist generation inputs', async () => {
  // Model an existing version-1 library alongside data left in localStorage.
  await new Promise((resolve, reject) => {
    const request = indexedDB.open('peel_gallery_db', 1)
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore('images', { keyPath: 'id' })
      store.createIndex('timestamp', 'timestamp')
      store.put({ id: 'existing', imageUrl: image, prompt: 'Existing image', timestamp: '2025-01-01T00:00:00.000Z' })
    }
    request.onsuccess = () => { request.result.close(); resolve() }
    request.onerror = () => reject(request.error)
  })
  localStorage.setItem('peel_gallery', JSON.stringify([
    { id: 'existing', imageUrl: image, prompt: 'Do not overwrite', timestamp: '2025-01-01T00:00:00.000Z' },
    { id: 'legacy', imageUrl: image, prompt: 'Legacy image', timestamp: '2024-01-01T00:00:00.000Z' },
  ]))
  const migrated = await getSavedImages()
  assert.equal(migrated.length, 2)
  assert.equal(migrated.find(record => record.id === 'existing').prompt, 'Existing image')
  assert.equal(localStorage.getItem('peel_gallery'), null)
  const generation = createGeneration('Submitted prompt', { model: 'test/model', seed: 17 }, [])
  await saveGeneration(generation)
  assert.equal((await getGenerations())[0].status, 'interrupted')
  await completeGeneration(generation, image)
  const history = await getGenerations()
  assert.equal(history[0].status, 'completed')
  assert.equal(history[0].prompt, 'Submitted prompt')
  assert.ok(history[0].blob instanceof Blob)
  assert.equal(history[0].result.url, image)
  await saveImage(history[0].result, { generationId: generation.id, prompt: generation.prompt, settings: generation.settings })
  await updateImage(generation.id, { title: 'Study', tags: ['film'], collection: 'Portraits', favorite: true, prompt: 'Forbidden overwrite' })
  await saveImage(history[0].result, { generationId: generation.id, prompt: generation.prompt, settings: generation.settings })
  assert.equal(await getImageCount(), 3)
  const saved = (await getSavedImages()).find(record => record.id === generation.id)
  assert.equal(saved.prompt, 'Submitted prompt')
  assert.deepEqual(saved.settings, { model: 'test/model', seed: 17 })
  assert.equal(saved.title, 'Study')
  assert.equal(saved.collection, 'Portraits')
  assert.equal(saved.favorite, true)
  assert.deepEqual(saved.tags, ['film'])
  assert.equal(saved.imageUrl, image)
  await deleteImage(saved.id)
  assert.equal(await getImageCount(), 2)
  await restoreImage(saved)
  assert.equal(await getImageCount(), 3)
  assert.equal((await getSavedImages()).find(record => record.id === saved.id).favorite, true)
})
