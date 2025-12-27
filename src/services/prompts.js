/**
 * Prompts service for managing saved prompts
 * Stores prompts in localStorage with metadata
 */

const PROMPTS_STORAGE_KEY = 'peel_prompts'

/**
 * Get all saved prompts from storage
 */
export function getSavedPrompts() {
  try {
    const saved = localStorage.getItem(PROMPTS_STORAGE_KEY)
    return saved ? JSON.parse(saved) : []
  } catch (error) {
    console.error('Error loading prompts:', error)
    return []
  }
}

/**
 * Save a prompt to storage
 */
export function savePrompt(promptText, name = null) {
  try {
    if (!promptText || !promptText.trim()) {
      throw new Error('Prompt cannot be empty')
    }

    const prompts = getSavedPrompts()
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
    
    localStorage.setItem(PROMPTS_STORAGE_KEY, JSON.stringify(limitedPrompts))
    return newPrompt
  } catch (error) {
    console.error('Error saving prompt:', error)
    throw new Error('Failed to save prompt: ' + error.message)
  }
}

/**
 * Delete a prompt from storage
 */
export function deletePrompt(promptId) {
  try {
    const prompts = getSavedPrompts()
    const filtered = prompts.filter(p => p.id !== promptId)
    localStorage.setItem(PROMPTS_STORAGE_KEY, JSON.stringify(filtered))
    return true
  } catch (error) {
    console.error('Error deleting prompt:', error)
    throw new Error('Failed to delete prompt')
  }
}

/**
 * Get prompt count
 */
export function getPromptCount() {
  return getSavedPrompts().length
}

