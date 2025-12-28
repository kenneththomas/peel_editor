/**
 * Migration utility to export existing browser data to file storage
 * This allows users to copy their existing data before switching to file-based storage
 */

import * as fileStorage from './fileStorage'
import { getAllPosts } from './feed'
import { getSavedImages } from './gallery'
import { getProfile } from './profile'
import { getSavedPrompts } from './prompts'

/**
 * Export all data from IndexedDB and localStorage to files
 * This creates a backup of all existing data
 */
export async function exportBrowserData() {
  try {
    // Initialize file storage directory (will prompt user to select folder)
    // This MUST be called from a user gesture (button click)
    const dir = await fileStorage.initDataDirectory()
    if (!dir) {
      throw new Error('Failed to initialize data directory. Please try again.')
    }
    
    const migrationReport = {
      success: true,
      errors: [],
      exported: {
        posts: 0,
        images: 0,
        profiles: 0,
        prompts: 0,
        settings: 0
      },
      files: []
    }

    // 1. Export Feed Posts (IndexedDB)
    try {
      const posts = await getAllPosts()
      if (posts.length > 0) {
        await fileStorage.writeJSONFile('feed_posts.json', posts)
        migrationReport.exported.posts = posts.length
        migrationReport.files.push('feed_posts.json')
        console.log(`Exported ${posts.length} posts`)
      }
    } catch (error) {
      migrationReport.errors.push(`Error exporting posts: ${error.message}`)
      console.error('Error exporting posts:', error)
    }

    // 2. Export Gallery Images (IndexedDB)
    try {
      const images = await getSavedImages()
      if (images.length > 0) {
        // Save metadata first (without the large image data URLs)
        // Keep image URLs in metadata but don't save separate files for now
        // This makes migration much faster - images are already in the data URLs
        const imagesMetadata = images.map(img => ({
          ...img,
          // Keep the imageUrl in metadata - it will be preserved
        }))
        
        await fileStorage.writeJSONFile('gallery_images.json', imagesMetadata)
        migrationReport.exported.images = images.length
        migrationReport.files.push('gallery_images.json')
        console.log(`Exported ${images.length} images metadata`)
        
        // Optionally extract images as separate files (commented out for speed)
        // Uncomment this if you want separate image files
        /*
        const imageFiles = []
        for (let i = 0; i < images.length; i++) {
          const image = images[i]
          if (image.imageUrl && image.imageUrl.startsWith('data:')) {
            try {
              console.log(`Processing image ${i + 1}/${images.length}...`)
              const response = await fetch(image.imageUrl)
              const blob = await response.blob()
              const filename = `gallery_image_${image.id}.png`
              await fileStorage.writeBinaryFile(filename, blob)
              imageFiles.push(filename)
            } catch (error) {
              console.error(`Error saving image file for ${image.id}:`, error)
              migrationReport.errors.push(`Error saving image ${image.id}: ${error.message}`)
            }
          }
        }
        migrationReport.files.push(...imageFiles)
        */
      }
    } catch (error) {
      migrationReport.errors.push(`Error exporting images: ${error.message}`)
      console.error('Error exporting images:', error)
    }

    // 3. Export Profiles (IndexedDB)
    // We need to get all profiles - since we don't have a getAllProfiles function,
    // we'll need to check if we can iterate through IndexedDB or create a list
    try {
      // Try to export known profiles
      // For now, we'll create a placeholder - the actual profiles will be loaded on demand
      const profiles = []
      
      // Try to access IndexedDB directly to get all profiles
      const DB_NAME = 'peel_profile_db'
      const STORE_NAME = 'profiles'
      
      try {
        const db = await new Promise((resolve, reject) => {
          const request = indexedDB.open(DB_NAME)
          request.onsuccess = () => resolve(request.result)
          request.onerror = () => reject(request.error)
        })

        const transaction = db.transaction([STORE_NAME], 'readonly')
        const store = transaction.objectStore(STORE_NAME)
        const getAllRequest = store.getAll()

        const allProfiles = await new Promise((resolve, reject) => {
          getAllRequest.onsuccess = () => resolve(getAllRequest.result)
          getAllRequest.onerror = () => reject(getAllRequest.error)
        })

        if (allProfiles.length > 0) {
          await fileStorage.writeJSONFile('profiles.json', allProfiles)
          migrationReport.exported.profiles = allProfiles.length
          migrationReport.files.push('profiles.json')
          console.log(`Exported ${allProfiles.length} profiles`)
          
          // Save profile pictures
          for (const profile of allProfiles) {
            if (profile.profilePicture && profile.profilePicture.startsWith('data:')) {
              try {
                const response = await fetch(profile.profilePicture)
                const blob = await response.blob()
                const filename = `profile_picture_${profile.username}.png`
                await fileStorage.writeBinaryFile(filename, blob)
                migrationReport.files.push(filename)
              } catch (error) {
                console.error(`Error saving profile picture for ${profile.username}:`, error)
              }
            }
          }
        }
      } catch (error) {
        console.warn('Could not export profiles from IndexedDB:', error)
      }
    } catch (error) {
      migrationReport.errors.push(`Error exporting profiles: ${error.message}`)
      console.error('Error exporting profiles:', error)
    }

    // 4. Export Prompts (localStorage and file storage)
    try {
      // First try file storage (in case it's already been migrated)
      const prompts = await getSavedPrompts()
      if (prompts.length > 0) {
        await fileStorage.writeJSONFile('prompts.json', prompts)
        migrationReport.exported.prompts = prompts.length
        migrationReport.files.push('prompts.json')
        console.log(`Exported ${prompts.length} prompts`)
      } else {
        // Try localStorage as fallback
        try {
          const saved = localStorage.getItem('peel_prompts')
          if (saved) {
            const localPrompts = JSON.parse(saved)
            if (localPrompts.length > 0) {
              await fileStorage.writeJSONFile('prompts.json', localPrompts)
              migrationReport.exported.prompts = localPrompts.length
              migrationReport.files.push('prompts.json')
              console.log(`Exported ${localPrompts.length} prompts from localStorage`)
            }
          }
        } catch (e) {
          // No localStorage data, that's okay
        }
      }
    } catch (error) {
      migrationReport.errors.push(`Error exporting prompts: ${error.message}`)
      console.error('Error exporting prompts:', error)
    }

    // 5. Export Settings (localStorage)
    try {
      const apiKey = localStorage.getItem('apiKey')
      const apiUrl = localStorage.getItem('apiUrl')
      const settings = localStorage.getItem('settings')
      
      const settingsData = {
        apiKey: apiKey || '',
        apiUrl: apiUrl || '',
        settings: settings ? JSON.parse(settings) : {}
      }
      
      await fileStorage.writeJSONFile('settings.json', settingsData)
      migrationReport.exported.settings = 1
      migrationReport.files.push('settings.json')
      console.log('Exported settings')
    } catch (error) {
      migrationReport.errors.push(`Error exporting settings: ${error.message}`)
      console.error('Error exporting settings:', error)
    }

    // 6. Create a migration manifest
    const manifest = {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      counts: migrationReport.exported,
      files: migrationReport.files
    }
    
    await fileStorage.writeJSONFile('_migration_manifest.json', manifest)
    migrationReport.manifest = manifest

    if (migrationReport.errors.length > 0) {
      migrationReport.success = false
    }

    // Mark migration as completed in localStorage
    if (migrationReport.success) {
      markMigrationCompleted()
    }

    return migrationReport
  } catch (error) {
    console.error('Migration error:', error)
    return {
      success: false,
      errors: [error.message],
      exported: {},
      files: []
    }
  }
}

/**
 * Get migration status - check if data has already been migrated
 */
export async function getMigrationStatus() {
  try {
    // First check localStorage flag (faster check, works even if directory not initialized)
    const migrationFlag = localStorage.getItem('peel_migration_completed')
    if (migrationFlag === 'true') {
      return {
        migrated: true,
        manifest: null
      }
    }

    // Also check the manifest file (more reliable, but requires directory to be initialized)
    const manifest = await fileStorage.readJSONFile('_migration_manifest.json')
    if (manifest) {
      // Update localStorage flag for faster future checks
      localStorage.setItem('peel_migration_completed', 'true')
      return {
        migrated: true,
        manifest: manifest
      }
    }

    return {
      migrated: false,
      manifest: null
    }
  } catch (error) {
    // If we can't check, default to not migrated
    return {
      migrated: false,
      manifest: null
    }
  }
}

/**
 * Mark migration as completed
 */
export function markMigrationCompleted() {
  localStorage.setItem('peel_migration_completed', 'true')
}

