/**
 * Settings service for managing app settings
 * Uses file storage for permanent storage
 */

import * as fileStorage from './fileStorage'

const SETTINGS_FILE = 'settings.json'
let settingsCache = null
let migrationChecked = false

/**
 * Initialize file storage and migrate from localStorage if needed
 */
async function initStorage() {
  if (migrationChecked) {
    return
  }
  
  try {
    // Check if file storage already has settings
    const existingSettings = await fileStorage.readJSONFile(SETTINGS_FILE)
    if (existingSettings) {
      settingsCache = existingSettings
      migrationChecked = true
      return
    }

    // Try to migrate from localStorage
    try {
      const apiKey = localStorage.getItem('apiKey') || ''
      const apiUrl = localStorage.getItem('apiUrl') || ''
      const settings = localStorage.getItem('settings')
      
      const settingsData = {
        apiKey: apiKey,
        apiUrl: apiUrl,
        settings: settings ? JSON.parse(settings) : {}
      }
      
      if (apiKey || apiUrl || settings) {
        await fileStorage.writeJSONFile(SETTINGS_FILE, settingsData)
        settingsCache = settingsData
        console.log('Migrated settings from localStorage to file storage')
      } else {
        settingsCache = { apiKey: '', apiUrl: '', settings: {} }
      }
    } catch (error) {
      // No localStorage data, that's okay
      settingsCache = { apiKey: '', apiUrl: '', settings: {} }
    }
    
    migrationChecked = true
  } catch (error) {
    console.error('Error initializing storage:', error)
    settingsCache = { apiKey: '', apiUrl: '', settings: {} }
    migrationChecked = true
  }
}

/**
 * Save settings to file storage
 */
async function saveSettings(settingsData) {
  try {
    const result = await fileStorage.writeJSONFile(SETTINGS_FILE, settingsData)
    if (result !== false) {
      settingsCache = settingsData
    }
    // If result is false, directory not initialized yet - that's okay, we'll save later
  } catch (error) {
    console.error('Error saving settings:', error)
    // Don't throw - allow app to continue even if file storage isn't ready
  }
}

/**
 * Get all settings
 */
export async function getSettings() {
  try {
    await initStorage()
    
    if (settingsCache) {
      return settingsCache
    }
    
    // Try to load from file
    const settings = await fileStorage.readJSONFile(SETTINGS_FILE) || { apiKey: '', apiUrl: '', settings: {} }
    settingsCache = settings
    return settings
  } catch (error) {
    console.error('Error loading settings:', error)
    return { apiKey: '', apiUrl: '', settings: {} }
  }
}

/**
 * Get API key
 */
export async function getApiKey() {
  const settings = await getSettings()
  return settings.apiKey || ''
}

/**
 * Set API key
 */
export async function setApiKey(apiKey) {
  const settings = await getSettings()
  settings.apiKey = apiKey || ''
  await saveSettings(settings)
}

/**
 * Get API URL
 */
export async function getApiUrl() {
  const settings = await getSettings()
  return settings.apiUrl || ''
}

/**
 * Set API URL
 */
export async function setApiUrl(apiUrl) {
  const settings = await getSettings()
  settings.apiUrl = apiUrl || ''
  await saveSettings(settings)
}

/**
 * Get app settings (not API key/URL)
 */
export async function getAppSettings() {
  const settings = await getSettings()
  return settings.settings || {}
}

/**
 * Set app settings (not API key/URL)
 */
export async function setAppSettings(appSettings) {
  const settings = await getSettings()
  settings.settings = appSettings || {}
  await saveSettings(settings)
}

