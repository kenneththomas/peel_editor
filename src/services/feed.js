/**
 * Feed service for managing Instagram-style posts
 * Uses IndexedDB for permanent storage
 */

const DB_NAME = 'peel_feed_db'
const DB_VERSION = 2
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
        objectStore.createIndex('taggedUsernames', 'taggedUsernames', { unique: false, multiEntry: true })
      } else {
        // Migration for existing databases
        const transaction = event.target.transaction
        const objectStore = transaction.objectStore(STORE_NAME)
        
        // Add taggedUsernames index if upgrading from version 1
        if (event.oldVersion < 2 && !objectStore.indexNames.contains('taggedUsernames')) {
          objectStore.createIndex('taggedUsernames', 'taggedUsernames', { unique: false, multiEntry: true })
          
          // Migrate existing posts to have taggedUsernames array
          const getAllRequest = objectStore.getAll()
          getAllRequest.onsuccess = () => {
            const posts = getAllRequest.result
            posts.forEach(post => {
              if (!post.taggedUsernames) {
                post.taggedUsernames = []
                objectStore.put(post)
              }
            })
          }
        }
      }
    }
  })
}

/**
 * Get all posts from storage (sorted by timestamp descending)
 * Deduplicates posts - each post appears only once even if multiple users are tagged
 */
export async function getAllPosts() {
  try {
    await initDB()
    
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const index = store.index('timestamp')
    
    const request = index.openCursor(null, 'prev') // Sort by timestamp descending
    const posts = []
    const seenIds = new Set()

    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        const cursor = event.target.result
        if (cursor) {
          const post = cursor.value
          // Ensure taggedUsernames exists for backward compatibility
          if (!post.taggedUsernames) {
            post.taggedUsernames = []
          }
          // Only add if we haven't seen this post ID before
          if (!seenIds.has(post.id)) {
            posts.push(post)
            seenIds.add(post.id)
          }
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
 * Get posts by username (includes posts where user is author or tagged)
 */
export async function getPostsByUsername(username) {
  try {
    await initDB()
    
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    
    // Get posts where user is the author
    const usernameIndex = store.index('username')
    const usernameRequest = usernameIndex.openCursor(IDBKeyRange.only(username), 'prev')
    const posts = []
    const postIds = new Set()

    return new Promise((resolve, reject) => {
      // First, get posts where user is author
      usernameRequest.onsuccess = (event) => {
        const cursor = event.target.result
        if (cursor) {
          const post = cursor.value
          // Ensure taggedUsernames exists for backward compatibility
          if (!post.taggedUsernames) {
            post.taggedUsernames = []
          }
          posts.push(post)
          postIds.add(post.id)
          cursor.continue()
        } else {
          // Then, get posts where user is tagged
          const taggedIndex = store.index('taggedUsernames')
          const taggedRequest = taggedIndex.openCursor(IDBKeyRange.only(username), 'prev')
          
          taggedRequest.onsuccess = (tagEvent) => {
            const taggedCursor = tagEvent.target.result
            if (taggedCursor) {
              const post = taggedCursor.value
              // Ensure taggedUsernames exists for backward compatibility
              if (!post.taggedUsernames) {
                post.taggedUsernames = []
              }
              // Only add if not already in the list (shouldn't happen, but just in case)
              if (!postIds.has(post.id)) {
                posts.push(post)
                postIds.add(post.id)
              }
              taggedCursor.continue()
            } else {
              // Sort by timestamp descending
              posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
              resolve(posts)
            }
          }
          
          taggedRequest.onerror = () => {
            console.error('Error loading tagged posts:', taggedRequest.error)
            // Resolve with what we have so far
            posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            resolve(posts)
          }
        }
      }

      usernameRequest.onerror = () => {
        console.error('Error loading posts by username:', usernameRequest.error)
        reject(usernameRequest.error)
      }
    })
  } catch (error) {
    console.error('Error loading posts by username:', error)
    return []
  }
}

/**
 * Create a new post
 * @param {string} imageUrl - URL of the post image
 * @param {string} username - Author username
 * @param {string} caption - Post caption
 * @param {string[]} taggedUsernames - Array of usernames to tag (optional)
 */
export async function createPost(imageUrl, username, caption, taggedUsernames = []) {
  try {
    await initDB()
    
    // Filter out empty strings and ensure unique usernames
    const cleanTaggedUsernames = [...new Set(taggedUsernames.filter(u => u && u.trim()))]
    
    const newPost = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      imageUrl: imageUrl,
      username: username,
      caption: caption || '',
      timestamp: new Date().toISOString(),
      likes: [],
      likesCount: 0,
      taggedUsernames: cleanTaggedUsernames
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
        
        // Ensure taggedUsernames exists for backward compatibility
        if (!post.taggedUsernames) {
          post.taggedUsernames = []
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
        
        // Ensure taggedUsernames is an array
        if (updates.taggedUsernames !== undefined) {
          updatedPost.taggedUsernames = [...new Set(updates.taggedUsernames.filter(u => u && u.trim()))]
        } else if (!updatedPost.taggedUsernames) {
          updatedPost.taggedUsernames = []
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

