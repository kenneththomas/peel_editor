/**
 * Prompts service for managing saved prompts
 * Stores prompts in file storage
 */

import * as fileStorage from './fileStorage'

const PROMPTS_FILE = 'prompts.json'
const PROMPTS_STORAGE_KEY = 'peel_prompts' // For migration from localStorage
let promptsCache = null
let migrationChecked = false

/**
 * Initialize file storage and migrate from localStorage if needed
 */
async function initStorage() {
  if (migrationChecked) {
    return
  }
  
  try {
    // Check if file storage already has prompts
    const existingPrompts = await fileStorage.readJSONFile(PROMPTS_FILE)
    if (existingPrompts && existingPrompts.length > 0) {
      promptsCache = existingPrompts
      migrationChecked = true
      return
    }

    // Try to migrate from localStorage
    try {
      const saved = localStorage.getItem(PROMPTS_STORAGE_KEY)
      if (saved) {
        const prompts = JSON.parse(saved)
        if (prompts.length > 0) {
          await fileStorage.writeJSONFile(PROMPTS_FILE, prompts)
          promptsCache = prompts
          console.log(`Migrated ${prompts.length} prompts from localStorage to file storage`)
        }
      }
    } catch (error) {
      // No localStorage data, that's okay
    }

    if (!promptsCache) {
      promptsCache = []
    }
    
    migrationChecked = true
  } catch (error) {
    console.error('Error initializing storage:', error)
    promptsCache = []
    migrationChecked = true
  }
}

/**
 * Get all saved prompts from storage
 */
export async function getSavedPrompts() {
  try {
    await initStorage()
    
    if (promptsCache) {
      return promptsCache
    }
    
    // Try to load from file
    const prompts = await fileStorage.readJSONFile(PROMPTS_FILE) || []
    promptsCache = prompts
    return prompts
  } catch (error) {
    console.error('Error loading prompts:', error)
    return []
  }
}

/**
 * Save a prompt to storage
 */
export async function savePrompt(promptText, name = null) {
  try {
    if (!promptText || !promptText.trim()) {
      throw new Error('Prompt cannot be empty')
    }

    await initStorage()
    const prompts = await getSavedPrompts()
    const promptName = name || `Prompt ${new Date().toLocaleString()}`
    
    const newPrompt = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: promptName,
      text: promptText,
      timestamp: new Date().toISOString(),
    }
    
    prompts.unshift(newPrompt) // Add to beginning
    
    // Limit to 100 prompts to prevent storage issues
    const limitedPrompts = prompts.slice(0, 100)
    
    await fileStorage.writeJSONFile(PROMPTS_FILE, limitedPrompts)
    promptsCache = limitedPrompts
    return newPrompt
  } catch (error) {
    console.error('Error saving prompt:', error)
    throw new Error('Failed to save prompt: ' + error.message)
  }
}

/**
 * Delete a prompt from storage
 */
export async function deletePrompt(promptId) {
  try {
    await initStorage()
    const prompts = await getSavedPrompts()
    const filtered = prompts.filter(p => p.id !== promptId)
    await fileStorage.writeJSONFile(PROMPTS_FILE, filtered)
    promptsCache = filtered
    return true
  } catch (error) {
    console.error('Error deleting prompt:', error)
    throw new Error('Failed to delete prompt')
  }
}

/**
 * Get prompt count
 */
export async function getPromptCount() {
  const prompts = await getSavedPrompts()
  return prompts.length
}

