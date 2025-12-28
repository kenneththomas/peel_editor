/**
 * Gallery service for managing saved images
 * Uses file storage for permanent storage
 */

import * as fileStorage from './fileStorage'

const IMAGES_FILE = 'gallery_images.json'
let imagesCache = null
let migrationChecked = false

/**
 * Initialize file storage and migrate from IndexedDB/localStorage if needed
 */
async function initStorage() {
  if (migrationChecked) {
    return
  }
  
  try {
    // Check if file storage already has images
    const existingImages = await fileStorage.readJSONFile(IMAGES_FILE)
    if (existingImages && existingImages.length > 0) {
      imagesCache = existingImages
      migrationChecked = true
      return
    }

    // Try to migrate from IndexedDB
    try {
      const DB_NAME = 'peel_gallery_db'
      const STORE_NAME = 'images'
      
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })

      const transaction = db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const getAllRequest = store.getAll()

      const indexedDBImages = await new Promise((resolve, reject) => {
        getAllRequest.onsuccess = () => resolve(getAllRequest.result)
        getAllRequest.onerror = () => reject(getAllRequest.error)
      })

      if (indexedDBImages && indexedDBImages.length > 0) {
        await fileStorage.writeJSONFile(IMAGES_FILE, indexedDBImages)
        imagesCache = indexedDBImages
        console.log(`Migrated ${indexedDBImages.length} images from IndexedDB to file storage`)
        migrationChecked = true
        return
      }
    } catch (error) {
      // IndexedDB might not exist, try localStorage
    }

    // Try to migrate from localStorage (legacy)
    try {
      const localStorageKey = 'peel_gallery'
      const saved = localStorage.getItem(localStorageKey)
      if (saved) {
        const images = JSON.parse(saved)
        if (images.length > 0) {
          await fileStorage.writeJSONFile(IMAGES_FILE, images)
          imagesCache = images
          localStorage.removeItem(localStorageKey)
          console.log(`Migrated ${images.length} images from localStorage to file storage`)
        }
      }
    } catch (error) {
      // No localStorage data, that's okay
    }

    if (!imagesCache) {
      imagesCache = []
    }
    
    migrationChecked = true
  } catch (error) {
    console.error('Error initializing storage:', error)
    imagesCache = []
    migrationChecked = true
  }
}

/**
 * Save images to file storage
 */
async function saveImages(images) {
  try {
    await fileStorage.writeJSONFile(IMAGES_FILE, images)
    imagesCache = images
  } catch (error) {
    console.error('Error saving images:', error)
    throw error
  }
}

/**
 * Get all saved images from storage
 */
export async function getSavedImages() {
  try {
    await initStorage()
    
    if (imagesCache) {
      // Sort by timestamp descending
      return [...imagesCache].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    }
    
    // Try to load from file
    const images = await fileStorage.readJSONFile(IMAGES_FILE) || []
    imagesCache = images
    
    // Sort by timestamp descending
    return [...images].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
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
    await initStorage()
    
    const newImage = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      imageUrl: typeof imageData === 'string' ? imageData : imageData.url,
      prompt: metadata.prompt || '',
      timestamp: new Date().toISOString(),
      ...metadata
    }

    const allImages = await getSavedImages()
    allImages.unshift(newImage) // Add to beginning
    await saveImages(allImages)

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
    await initStorage()
    
    const allImages = await getSavedImages()
    const filteredImages = allImages.filter(img => img.id !== imageId)
    
    if (filteredImages.length === allImages.length) {
      throw new Error('Image not found')
    }
    
    await saveImages(filteredImages)
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
    await initStorage()
    await saveImages([])
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
