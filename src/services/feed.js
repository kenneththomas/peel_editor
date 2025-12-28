/**
 * Feed service for managing Instagram-style posts
 * Uses IndexedDB for permanent storage
 */

const DB_NAME = 'peel_feed_db'
const DB_VERSION = 1
const STORE_NAME = 'posts'

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
        objectStore.createIndex('username', 'username', { unique: false })
      }
    }
  })
}

/**
 * Get all posts from storage (sorted by timestamp descending)
 */
export async function getAllPosts() {
  try {
    await initDB()
    
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const index = store.index('timestamp')
    
    const request = index.openCursor(null, 'prev') // Sort by timestamp descending
    const posts = []

    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        const cursor = event.target.result
        if (cursor) {
          posts.push(cursor.value)
          cursor.continue()
        } else {
          resolve(posts)
        }
      }

      request.onerror = () => {
        console.error('Error loading posts:', request.error)
        reject(request.error)
      }
    })
  } catch (error) {
    console.error('Error loading posts:', error)
    return []
  }
}

/**
 * Get posts by username
 */
export async function getPostsByUsername(username) {
  try {
    await initDB()
    
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const index = store.index('username')
    
    const request = index.openCursor(IDBKeyRange.only(username), 'prev')
    const posts = []

    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        const cursor = event.target.result
        if (cursor) {
          posts.push(cursor.value)
          cursor.continue()
        } else {
          resolve(posts)
        }
      }

      request.onerror = () => {
        console.error('Error loading posts by username:', request.error)
        reject(request.error)
      }
    })
  } catch (error) {
    console.error('Error loading posts by username:', error)
    return []
  }
}

/**
 * Create a new post
 */
export async function createPost(imageUrl, username, caption) {
  try {
    await initDB()
    
    const newPost = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      imageUrl: imageUrl,
      username: username,
      caption: caption || '',
      timestamp: new Date().toISOString(),
      likes: [],
      likesCount: 0
    }

    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    
    await new Promise((resolve, reject) => {
      const request = store.add(newPost)
      request.onsuccess = () => resolve(newPost)
      request.onerror = () => {
        console.error('Error creating post:', request.error)
        reject(new Error('Failed to create post'))
      }
    })

    return newPost
  } catch (error) {
    console.error('Error creating post:', error)
    throw new Error('Failed to create post')
  }
}

/**
 * Update a post (caption and likesCount)
 */
export async function updatePost(postId, updates) {
  try {
    await initDB()
    
    // First, get the existing post
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    
    const getRequest = store.get(postId)
    
    return new Promise((resolve, reject) => {
      getRequest.onsuccess = () => {
        const post = getRequest.result
        if (!post) {
          reject(new Error('Post not found'))
          return
        }
        
        // Update only the provided fields
        const updatedPost = {
          ...post,
          ...updates
        }
        
        // Ensure likesCount is a number
        if (updates.likesCount !== undefined) {
          updatedPost.likesCount = parseInt(updates.likesCount) || 0
        }
        
        const updateRequest = store.put(updatedPost)
        updateRequest.onsuccess = () => resolve(updatedPost)
        updateRequest.onerror = () => {
          console.error('Error updating post:', updateRequest.error)
          reject(new Error('Failed to update post'))
        }
      }
      
      getRequest.onerror = () => {
        console.error('Error getting post:', getRequest.error)
        reject(new Error('Failed to get post'))
      }
    })
  } catch (error) {
    console.error('Error updating post:', error)
    throw new Error('Failed to update post')
  }
}

/**
 * Delete a post
 */
export async function deletePost(postId) {
  try {
    await initDB()
    
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    
    await new Promise((resolve, reject) => {
      const request = store.delete(postId)
      request.onsuccess = () => resolve(true)
      request.onerror = () => {
        console.error('Error deleting post:', request.error)
        reject(new Error('Failed to delete post'))
      }
    })

    return true
  } catch (error) {
    console.error('Error deleting post:', error)
    throw new Error('Failed to delete post')
  }
}

/**
 * Get post count
 */
export async function getPostCount() {
  try {
    const posts = await getAllPosts()
    return posts.length
  } catch (error) {
    console.error('Error getting post count:', error)
    return 0
  }
}

