/**
 * Gallery service for managing saved images
 * Stores images in localStorage with metadata
 */

const GALLERY_STORAGE_KEY = 'peel_gallery'

/**
 * Get all saved images from storage
 */
export function getSavedImages() {
  try {
    const saved = localStorage.getItem(GALLERY_STORAGE_KEY)
    return saved ? JSON.parse(saved) : []
  } catch (error) {
    console.error('Error loading gallery:', error)
    return []
  }
}

/**
 * Save an image to the gallery
 */
export function saveImage(imageData, metadata = {}) {
  try {
    const images = getSavedImages()
    const newImage = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      imageUrl: typeof imageData === 'string' ? imageData : imageData.url,
      prompt: metadata.prompt || '',
      timestamp: new Date().toISOString(),
      ...metadata
    }
    
    images.unshift(newImage) // Add to beginning
    
    // Limit to 100 images to prevent storage issues
    const limitedImages = images.slice(0, 100)
    
    localStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(limitedImages))
    return newImage
  } catch (error) {
    console.error('Error saving image:', error)
    throw new Error('Failed to save image to gallery')
  }
}

/**
 * Delete an image from the gallery
 */
export function deleteImage(imageId) {
  try {
    const images = getSavedImages()
    const filtered = images.filter(img => img.id !== imageId)
    localStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(filtered))
    return true
  } catch (error) {
    console.error('Error deleting image:', error)
    throw new Error('Failed to delete image from gallery')
  }
}

/**
 * Clear all images from the gallery
 */
export function clearGallery() {
  try {
    localStorage.removeItem(GALLERY_STORAGE_KEY)
    return true
  } catch (error) {
    console.error('Error clearing gallery:', error)
    throw new Error('Failed to clear gallery')
  }
}

/**
 * Get image count
 */
export function getImageCount() {
  return getSavedImages().length
}

