/**
 * Gallery service for managing saved images
 * Uses IndexedDB for permanent storage with large capacity
 */

const DB_NAME = 'peel_gallery_db'
const DB_VERSION = 1
const STORE_NAME = 'images'

let db = null

/**
 * Initialize IndexedDB database
 */
function initDB() {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db)
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      console.error('IndexedDB error:', request.error)
      reject(request.error)
    }

    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const database = event.target.result
      
      // Create object store if it doesn't exist
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = database.createObjectStore(STORE_NAME, { keyPath: 'id' })
        objectStore.createIndex('timestamp', 'timestamp', { unique: false })
      }
    }
  })
}

/**
 * Migrate existing localStorage data to IndexedDB (one-time migration)
 */
async function migrateFromLocalStorage() {
  try {
    const localStorageKey = 'peel_gallery'
    const saved = localStorage.getItem(localStorageKey)
    
    if (!saved) {
      return // Nothing to migrate
    }

    const images = JSON.parse(saved)
    if (images.length === 0) {
      localStorage.removeItem(localStorageKey)
      return
    }

    // Check if migration already happened by checking if IndexedDB has data
    const database = await initDB()
    const countRequest = database.transaction([STORE_NAME], 'readonly')
      .objectStore(STORE_NAME)
      .count()

    const count = await new Promise((resolve, reject) => {
      countRequest.onsuccess = () => resolve(countRequest.result)
      countRequest.onerror = () => reject(countRequest.error)
    })

    // If IndexedDB already has data, don't migrate
    if (count > 0) {
      localStorage.removeItem(localStorageKey)
      return
    }

    // Migrate images to IndexedDB
    const transaction = database.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    for (const image of images) {
      store.add(image)
    }

    await new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        localStorage.removeItem(localStorageKey)
        console.log(`Migrated ${images.length} images from localStorage to IndexedDB`)
        resolve()
      }
      transaction.onerror = () => reject(transaction.error)
    })
  } catch (error) {
    console.error('Migration error:', error)
    // Don't throw - allow app to continue even if migration fails
  }
}

/**
 * Get all saved images from storage
 */
export async function getSavedImages() {
  try {
    await initDB()
    await migrateFromLocalStorage() // One-time migration
    
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const index = store.index('timestamp')
    
    const request = index.openCursor(null, 'prev') // Sort by timestamp descending
    const images = []

    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        const cursor = event.target.result
        if (cursor) {
          images.push(cursor.value)
          cursor.continue()
        } else {
          resolve(images)
        }
      }

      request.onerror = () => {
        console.error('Error loading gallery:', request.error)
        reject(request.error)
      }
    })
  } catch (error) {
    console.error('Error loading gallery:', error)
    return []
  }
}

/**
 * Save an image to the gallery
 */
export async function saveImage(imageData, metadata = {}) {
  try {
    await initDB()
    
    const newImage = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      imageUrl: typeof imageData === 'string' ? imageData : imageData.url,
      prompt: metadata.prompt || '',
      timestamp: new Date().toISOString(),
      ...metadata
    }

    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    
    await new Promise((resolve, reject) => {
      const request = store.add(newImage)
      request.onsuccess = () => resolve(newImage)
      request.onerror = () => {
        console.error('Error saving image:', request.error)
        reject(new Error('Failed to save image to gallery'))
      }
    })

    return newImage
  } catch (error) {
    console.error('Error saving image:', error)
    throw new Error('Failed to save image to gallery')
  }
}

/**
 * Delete an image from the gallery
 */
export async function deleteImage(imageId) {
  try {
    await initDB()
    
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    
    await new Promise((resolve, reject) => {
      const request = store.delete(imageId)
      request.onsuccess = () => resolve(true)
      request.onerror = () => {
        console.error('Error deleting image:', request.error)
        reject(new Error('Failed to delete image from gallery'))
      }
    })

    return true
  } catch (error) {
    console.error('Error deleting image:', error)
    throw new Error('Failed to delete image from gallery')
  }
}

/**
 * Clear all images from the gallery
 */
export async function clearGallery() {
  try {
    await initDB()
    
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    
    await new Promise((resolve, reject) => {
      const request = store.clear()
      request.onsuccess = () => resolve(true)
      request.onerror = () => {
        console.error('Error clearing gallery:', request.error)
        reject(new Error('Failed to clear gallery'))
      }
    })

    return true
  } catch (error) {
    console.error('Error clearing gallery:', error)
    throw new Error('Failed to clear gallery')
  }
}

/**
 * Get image count
 */
export async function getImageCount() {
  try {
    const images = await getSavedImages()
    return images.length
  } catch (error) {
    console.error('Error getting image count:', error)
    return 0
  }
}
