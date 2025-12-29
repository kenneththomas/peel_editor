/**
 * Profile service for managing user profile data
 * Uses IndexedDB for permanent storage
 */

const DB_NAME = 'peel_profile_db'
const DB_VERSION = 1
const STORE_NAME = 'profiles'

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
        const objectStore = database.createObjectStore(STORE_NAME, { keyPath: 'username' })
        objectStore.createIndex('username', 'username', { unique: true })
      }
    }
  })
}

/**
 * Get profile by username
 */
export async function getProfile(username) {
  try {
    await initDB()
    
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    
    return new Promise((resolve, reject) => {
      const request = store.get(username)
      
      request.onsuccess = () => {
        resolve(request.result || { username, bio: '', profilePicture: null })
      }
      
      request.onerror = () => {
        console.error('Error loading profile:', request.error)
        reject(request.error)
      }
    })
  } catch (error) {
    console.error('Error loading profile:', error)
    return { username, bio: '', profilePicture: null }
  }
}

/**
 * Save profile (creates or updates)
 */
export async function saveProfile(username, bio, profilePicture) {
  try {
    await initDB()
    
    const profile = {
      username: username,
      bio: bio || '',
      profilePicture: profilePicture || null,
      updatedAt: new Date().toISOString()
    }

    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    
    await new Promise((resolve, reject) => {
      const request = store.put(profile)
      request.onsuccess = () => resolve(profile)
      request.onerror = () => {
        console.error('Error saving profile:', request.error)
        reject(new Error('Failed to save profile'))
      }
    })

    return profile
  } catch (error) {
    console.error('Error saving profile:', error)
    throw new Error('Failed to save profile')
  }
}

/**
 * Update profile bio
 */
export async function updateBio(username, bio) {
  try {
    const existingProfile = await getProfile(username)
    return await saveProfile(username, bio, existingProfile.profilePicture)
  } catch (error) {
    console.error('Error updating bio:', error)
    throw new Error('Failed to update bio')
  }
}

/**
 * Update profile picture
 */
export async function updateProfilePicture(username, profilePicture) {
  try {
    const existingProfile = await getProfile(username)
    return await saveProfile(username, existingProfile.bio, profilePicture)
  } catch (error) {
    console.error('Error updating profile picture:', error)
    throw new Error('Failed to update profile picture')
  }
}

