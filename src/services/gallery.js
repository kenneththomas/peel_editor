const DB_NAME = 'peel_gallery_db'
let connection

function database() {
  if (!connection) connection = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2)
    request.onupgradeneeded = () => {
      for (const name of ['images', 'generations']) {
        if (!request.result.objectStoreNames.contains(name)) {
          const store = request.result.createObjectStore(name, { keyPath: 'id' })
          store.createIndex('timestamp', 'timestamp')
        }
      }
    }
    request.onsuccess = () => {
      request.result.onversionchange = () => { request.result.close(); connection = null }
      resolve(request.result)
    }
    request.onerror = () => { connection = null; reject(request.error) }
    request.onblocked = () => { connection = null; reject(new Error('Close other Peel tabs to upgrade the library')) }
  })
  return connection
}

async function transact(name, mode, operation) {
  const db = await database()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(name, mode)
    const request = operation(tx.objectStore(name))
    tx.oncomplete = () => resolve(request?.result)
    tx.onerror = () => reject(tx.error || request?.error)
    tx.onabort = () => reject(tx.error || new Error('Storage transaction was interrupted'))
  })
}

let migration
async function migrate() {
  if (!migration) migration = (async () => {
    const saved = localStorage.getItem('peel_gallery')
    if (!saved) return
    const records = JSON.parse(saved)
    if (!Array.isArray(records)) throw new Error('Legacy library is invalid')
    const db = await database()
    await new Promise((resolve, reject) => {
      const tx = db.transaction('images', 'readwrite'), store = tx.objectStore('images')
      for (const record of records) {
        const request = store.get(record.id)
        request.onsuccess = () => { if (!request.result) store.put(record) }
      }
      tx.oncomplete = resolve
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
    localStorage.removeItem('peel_gallery')
  })().catch(error => { migration = null; throw error })
  return migration
}

export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Unable to read image'))
    reader.readAsDataURL(blob)
  })
}

async function imageBlob(image) {
  const url = typeof image === 'string' ? image : image?.url
  if (!url) throw new Error('No image to save')
  const response = await fetch(url)
  if (!response.ok) throw new Error('Unable to download image for local storage')
  const blob = await response.blob()
  if (!blob.type.startsWith('image/')) throw new Error('The result is not an image')
  return blob
}

async function hydrate(record) {
  return record.blob ? { ...record, imageUrl: await blobToDataUrl(record.blob) } : record
}

export async function getSavedImages() {
  await migrate()
  const records = await transact('images', 'readonly', store => store.getAll())
  return Promise.all(records.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).map(hydrate))
}

export async function saveImage(image, metadata = {}) {
  await migrate()
  const id = metadata.generationId || crypto.randomUUID()
  const existing = await transact('images', 'readonly', store => store.get(id))
  const record = {
    ...metadata,
    id,
    prompt: metadata.prompt || '',
    timestamp: metadata.timestamp || new Date().toISOString(),
    title: existing?.title || metadata.title || '',
    tags: existing?.tags || metadata.tags || [],
    collection: existing?.collection || metadata.collection || '',
    favorite: existing?.favorite ?? metadata.favorite ?? false,
    blob: await imageBlob(image),
  }
  await transact('images', 'readwrite', store => store.put(record))
  return hydrate(record)
}

export async function updateImage(id, changes) {
  const allowed = Object.fromEntries(Object.entries(changes).filter(([key]) => ['title', 'tags', 'collection', 'favorite'].includes(key)))
  const db = await database()
  await new Promise((resolve, reject) => {
    const tx = db.transaction('images', 'readwrite'), store = tx.objectStore('images')
    const request = store.get(id)
    request.onsuccess = () => {
      if (!request.result) { tx.abort(); return }
      store.put({ ...request.result, ...allowed })
    }
    tx.oncomplete = resolve
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(new Error('Image no longer exists'))
  })
}

export async function deleteImage(id) { await migrate(); return transact('images', 'readwrite', store => store.delete(id)) }
export async function clearGallery() { await migrate(); return transact('images', 'readwrite', store => store.clear()) }
export async function restoreImage(record) { return transact('images', 'readwrite', store => store.put(record)) }
export async function getImageCount() { await migrate(); return transact('images', 'readonly', store => store.count()) }
export async function saveGeneration(record) { return transact('generations', 'readwrite', store => store.put(record)) }
export async function completeGeneration(record, image) {
  const blob = await imageBlob(image)
  const completed = { ...record, status: 'completed', blob, completedAt: new Date().toISOString() }
  await saveGeneration(completed)
  return { ...completed, result: { url: await blobToDataUrl(blob) } }
}
export async function getGenerations() {
  const records = await transact('generations', 'readonly', store => store.getAll())
  return Promise.all(records.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).map(async record => ({
    ...record,
    status: record.status === 'pending' ? 'interrupted' : record.status,
    ...(record.blob ? { result: { url: await blobToDataUrl(record.blob) } } : {}),
  })))
}
