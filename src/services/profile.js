/**
 * Profile service for managing user profile data
 * Uses file storage for permanent storage
 */

import * as fileStorage from './fileStorage'

const PROFILES_FILE = 'profiles.json'
let profilesCache = null
let migrationChecked = false

/**
 * Initialize file storage and migrate from IndexedDB if needed
 */
async function initStorage() {
  if (migrationChecked) {
    return
  }
  
  try {
    // Check if file storage already has profiles
    const existingProfiles = await fileStorage.readJSONFile(PROFILES_FILE)
    if (existingProfiles && existingProfiles.length > 0) {
      profilesCache = existingProfiles
      migrationChecked = true
      return
    }

    // Try to migrate from IndexedDB
    try {
      const DB_NAME = 'peel_profile_db'
      const STORE_NAME = 'profiles'
      
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })

      const transaction = db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const getAllRequest = store.getAll()

      const indexedDBProfiles = await new Promise((resolve, reject) => {
        getAllRequest.onsuccess = () => resolve(getAllRequest.result)
        getAllRequest.onerror = () => reject(getAllRequest.error)
      })

      if (indexedDBProfiles && indexedDBProfiles.length > 0) {
        await fileStorage.writeJSONFile(PROFILES_FILE, indexedDBProfiles)
        profilesCache = indexedDBProfiles
        console.log(`Migrated ${indexedDBProfiles.length} profiles from IndexedDB to file storage`)
      } else {
        profilesCache = []
      }
    } catch (error) {
      // IndexedDB might not exist or be accessible, that's okay
      console.log('No IndexedDB data to migrate:', error.message)
      profilesCache = []
    }
    
    migrationChecked = true
  } catch (error) {
    console.error('Error initializing storage:', error)
    profilesCache = []
    migrationChecked = true
  }
}

/**
 * Save profiles to file storage
 */
async function saveProfiles(profiles) {
  try {
    await fileStorage.writeJSONFile(PROFILES_FILE, profiles)
    profilesCache = profiles
  } catch (error) {
    console.error('Error saving profiles:', error)
    throw error
  }
}

/**
 * Get profile by username
 */
export async function getProfile(username) {
  try {
    await initStorage()
    
    if (profilesCache) {
      const profile = profilesCache.find(p => p.username === username)
      return profile || { username, bio: '', profilePicture: null }
    }
    
    // Try to load from file
    const profiles = await fileStorage.readJSONFile(PROFILES_FILE) || []
    profilesCache = profiles
    
    const profile = profiles.find(p => p.username === username)
    return profile || { username, bio: '', profilePicture: null }
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
    await initStorage()
    
    const profile = {
      username: username,
      bio: bio || '',
      profilePicture: profilePicture || null,
      updatedAt: new Date().toISOString()
    }

    let profiles = await fileStorage.readJSONFile(PROFILES_FILE) || []
    const existingIndex = profiles.findIndex(p => p.username === username)
    
    if (existingIndex >= 0) {
      profiles[existingIndex] = profile
    } else {
      profiles.push(profile)
    }
    
    await saveProfiles(profiles)
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

