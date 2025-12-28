/**
 * File-based storage service using File System Access API
 * Stores data in a folder in the user's Documents directory
 */

const FOLDER_NAME = 'PeelEditor'
const DATA_FOLDER_NAME = 'data'

let dataDirectoryHandle = null

/**
 * Save directory handle to IndexedDB for persistence
 * Note: We only store the handle reference, not the actual data
 */
async function saveDirectoryHandle(handle) {
  try {
    // Store handle in a minimal IndexedDB just for the handle itself
    const DB_NAME = 'peel_handle_db'
    const DB_VERSION = 1
    const STORE_NAME = 'handles'

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const db = request.result
        const transaction = db.transaction([STORE_NAME], 'readwrite')
        const store = transaction.objectStore(STORE_NAME)
        
        // Store the handle
        store.put({ id: 'dataDirectory', handle: handle })
        
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
      }

      request.onupgradeneeded = (event) => {
        const db = event.target.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        }
      }
    })
  } catch (error) {
    console.warn('Could not save directory handle:', error)
    // This is not critical, we can continue without it
  }
}

/**
 * Get saved directory handle from IndexedDB
 */
async function getSavedDirectoryHandle() {
  try {
    const DB_NAME = 'peel_handle_db'
    const DB_VERSION = 1
    const STORE_NAME = 'handles'

    return new Promise((resolve) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onsuccess = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          resolve(null)
          return
        }

        try {
          const transaction = db.transaction([STORE_NAME], 'readonly')
          const store = transaction.objectStore(STORE_NAME)
          const getRequest = store.get('dataDirectory')

          getRequest.onsuccess = () => {
            const result = getRequest.result
            resolve(result ? result.handle : null)
          }

          getRequest.onerror = () => resolve(null)
        } catch (e) {
          resolve(null)
        }
      }

      request.onerror = () => resolve(null)
      
      request.onupgradeneeded = (event) => {
        // Database needs to be created/upgraded
        const db = event.target.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        }
      }
    })
  } catch (error) {
    return null
  }
}

/**
 * Initialize and get access to the data directory in Documents
 * This will prompt the user to select a directory on first use
 */
export async function initDataDirectory() {
  if (dataDirectoryHandle) {
    // Verify the handle is still valid
    try {
      await dataDirectoryHandle.getFileHandle('_test', { create: false }).catch(() => {})
      return dataDirectoryHandle
    } catch (e) {
      // Handle might be stale, reset it
      dataDirectoryHandle = null
    }
  }

  try {
    // Check if the File System Access API is available
    if (!('showDirectoryPicker' in window)) {
      throw new Error('File System Access API is not supported in this browser. Please use Chrome, Edge, or another Chromium-based browser.')
    }

    // Try to get saved handle from previous session
    try {
      const savedHandle = await getSavedDirectoryHandle()
      if (savedHandle) {
        // Verify the handle is still valid
        try {
          await savedHandle.getFileHandle('_test', { create: false }).catch(() => {})
          dataDirectoryHandle = savedHandle
          return dataDirectoryHandle
        } catch (e) {
          // Handle is invalid, continue to prompt for new one
        }
      }
    } catch (e) {
      // Couldn't get saved handle, continue to prompt
    }

    // Request access to Documents directory
    const handle = await window.showDirectoryPicker({
      mode: 'readwrite',
      startIn: 'documents'
    })

    // Try to get or create the PeelEditor folder
    let peelFolder = null
    try {
      peelFolder = await handle.getDirectoryHandle(FOLDER_NAME, { create: true })
    } catch (e) {
      // If that fails, use the selected directory directly
      peelFolder = handle
    }

    // Get or create the data folder
    dataDirectoryHandle = await peelFolder.getDirectoryHandle(DATA_FOLDER_NAME, { create: true })

    // Save the handle for future use
    await saveDirectoryHandle(dataDirectoryHandle)

    return dataDirectoryHandle
  } catch (error) {
    console.error('Error initializing data directory:', error)
    throw error
  }
}

/**
 * Get or create the data directory handle (reuses existing if available)
 * This will NOT prompt for directory selection - it only uses cached/saved handles
 * Returns null if no directory is available
 */
export async function getDataDirectory() {
  if (dataDirectoryHandle) {
    try {
      // Verify the handle is still valid
      await dataDirectoryHandle.getFileHandle('_test', { create: false }).catch(() => {})
      return dataDirectoryHandle
    } catch (e) {
      // Handle might be stale, reset it
      dataDirectoryHandle = null
    }
  }

  // Try to get saved handle from previous session
  try {
    const savedHandle = await getSavedDirectoryHandle()
    if (savedHandle) {
      // Verify the handle is still valid
      try {
        await savedHandle.getFileHandle('_test', { create: false }).catch(() => {})
        dataDirectoryHandle = savedHandle
        return dataDirectoryHandle
      } catch (e) {
        // Handle is invalid
        dataDirectoryHandle = null
        return null
      }
    }
  } catch (e) {
    // Couldn't get saved handle
  }

  return null
}

/**
 * Write JSON data to a file
 */
export async function writeJSONFile(filename, data) {
  try {
    const dir = await getDataDirectory()
    if (!dir) {
      // Directory not initialized yet - fail silently for background operations
      // This prevents errors when settings try to save before user selects folder
      console.warn(`Cannot write ${filename}: Directory not initialized yet`)
      return false
    }
    const fileHandle = await dir.getFileHandle(filename, { create: true })
    const writable = await fileHandle.createWritable()
    
    await writable.write(JSON.stringify(data, null, 2))
    await writable.close()
    
    return true
  } catch (error) {
    console.error(`Error writing file ${filename}:`, error)
    throw error
  }
}

/**
 * Read JSON data from a file
 */
export async function readJSONFile(filename) {
  try {
    const dir = await getDataDirectory()
    if (!dir) {
      // Directory not initialized yet - return null
      return null
    }
    const fileHandle = await dir.getFileHandle(filename, { create: false })
    const file = await fileHandle.getFile()
    const text = await file.text()
    
    return JSON.parse(text)
  } catch (error) {
    if (error.name === 'NotFoundError') {
      return null
    }
    console.error(`Error reading file ${filename}:`, error)
    throw error
  }
}

/**
 * Write binary data (Blob) to a file
 */
export async function writeBinaryFile(filename, blob) {
  try {
    const dir = await getDataDirectory()
    const fileHandle = await dir.getFileHandle(filename, { create: true })
    const writable = await fileHandle.createWritable()
    
    await writable.write(blob)
    await writable.close()
    
    return true
  } catch (error) {
    console.error(`Error writing binary file ${filename}:`, error)
    throw error
  }
}

/**
 * Read binary data from a file
 */
export async function readBinaryFile(filename) {
  try {
    const dir = await getDataDirectory()
    const fileHandle = await dir.getFileHandle(filename, { create: false })
    const file = await fileHandle.getFile()
    
    return await file.arrayBuffer()
  } catch (error) {
    if (error.name === 'NotFoundError') {
      return null
    }
    console.error(`Error reading binary file ${filename}:`, error)
    throw error
  }
}

/**
 * Delete a file
 */
export async function deleteFile(filename) {
  try {
    const dir = await getDataDirectory()
    await dir.removeEntry(filename, { recursive: false })
    return true
  } catch (error) {
    if (error.name === 'NotFoundError') {
      return true // File doesn't exist, consider it deleted
    }
    console.error(`Error deleting file ${filename}:`, error)
    throw error
  }
}

/**
 * List all files in the data directory
 */
export async function listFiles(pattern = null) {
  try {
    const dir = await getDataDirectory()
    const files = []
    
    for await (const [name, handle] of dir.entries()) {
      if (handle.kind === 'file') {
        if (!pattern || name.match(pattern)) {
          files.push(name)
        }
      }
    }
    
    return files
  } catch (error) {
    console.error('Error listing files:', error)
    throw error
  }
}

/**
 * Check if file exists
 */
export async function fileExists(filename) {
  try {
    const dir = await getDataDirectory()
    await dir.getFileHandle(filename, { create: false })
    return true
  } catch (error) {
    if (error.name === 'NotFoundError') {
      return false
    }
    throw error
  }
}

/**
 * Get the path to the data directory (for display purposes)
 * Note: This is approximate since we can't get the actual path from the API
 */
export function getDataDirectoryPath() {
  return `${FOLDER_NAME}/${DATA_FOLDER_NAME}`
}

