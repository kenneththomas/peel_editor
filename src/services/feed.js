/**
 * Feed service for managing Instagram-style posts
 * Uses file storage for permanent storage
 */

import * as fileStorage from './fileStorage'

const POSTS_FILE = 'feed_posts.json'
let postsCache = null
let migrationChecked = false

/**
 * Initialize file storage and migrate from IndexedDB if needed
 */
async function initStorage() {
  if (migrationChecked) {
    return
  }
  
  try {
    // Check if file storage already has posts
    const existingPosts = await fileStorage.readJSONFile(POSTS_FILE)
    if (existingPosts && existingPosts.length > 0) {
      postsCache = existingPosts
      migrationChecked = true
      return
    }

    // Try to migrate from IndexedDB
    try {
      const DB_NAME = 'peel_feed_db'
      const STORE_NAME = 'posts'
      
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })

      const transaction = db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const getAllRequest = store.getAll()

      const indexedDBPosts = await new Promise((resolve, reject) => {
        getAllRequest.onsuccess = () => resolve(getAllRequest.result)
        getAllRequest.onerror = () => reject(getAllRequest.error)
      })

      if (indexedDBPosts && indexedDBPosts.length > 0) {
        // Ensure all posts have taggedUsernames
        indexedDBPosts.forEach(post => {
          if (!post.taggedUsernames) {
            post.taggedUsernames = []
          }
        })
        
        // Save to file storage
        await fileStorage.writeJSONFile(POSTS_FILE, indexedDBPosts)
        postsCache = indexedDBPosts
        console.log(`Migrated ${indexedDBPosts.length} posts from IndexedDB to file storage`)
      } else {
        postsCache = []
      }
    } catch (error) {
      // IndexedDB might not exist or be accessible, that's okay
      console.log('No IndexedDB data to migrate:', error.message)
      postsCache = []
    }
    
    migrationChecked = true
  } catch (error) {
    console.error('Error initializing storage:', error)
    postsCache = []
    migrationChecked = true
  }
}

/**
 * Save posts to file storage
 */
async function savePosts(posts) {
  try {
    await fileStorage.writeJSONFile(POSTS_FILE, posts)
    postsCache = posts
  } catch (error) {
    console.error('Error saving posts:', error)
    throw error
  }
}

/**
 * Get all posts from storage (sorted by timestamp descending)
 * Deduplicates posts - each post appears only once even if multiple users are tagged
 */
export async function getAllPosts() {
  try {
    await initStorage()
    
    if (postsCache) {
      // Ensure all posts have taggedUsernames for backward compatibility
      postsCache.forEach(post => {
        if (!post.taggedUsernames) {
          post.taggedUsernames = []
        }
      })
      
      // Sort by timestamp descending and deduplicate
      const seenIds = new Set()
      const sorted = postsCache
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .filter(post => {
          if (seenIds.has(post.id)) {
            return false
          }
          seenIds.add(post.id)
          return true
        })
      
      return sorted
    }
    
    // Try to load from file
    const posts = await fileStorage.readJSONFile(POSTS_FILE) || []
    postsCache = posts
    
    // Ensure all posts have taggedUsernames
    posts.forEach(post => {
      if (!post.taggedUsernames) {
        post.taggedUsernames = []
      }
    })
    
    // Sort and deduplicate
    const seenIds = new Set()
    return posts
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .filter(post => {
        if (seenIds.has(post.id)) {
          return false
        }
        seenIds.add(post.id)
        return true
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
    const allPosts = await getAllPosts()
    const postIds = new Set()
    const userPosts = []

    // Get posts where user is author or tagged
    for (const post of allPosts) {
      const isAuthor = post.username === username
      const isTagged = post.taggedUsernames && post.taggedUsernames.includes(username)
      
      if ((isAuthor || isTagged) && !postIds.has(post.id)) {
        userPosts.push(post)
        postIds.add(post.id)
      }
    }

    // Sort by timestamp descending
    return userPosts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
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
    await initStorage()
    
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

    const allPosts = await getAllPosts()
    allPosts.unshift(newPost) // Add to beginning
    await savePosts(allPosts)

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
    await initStorage()
    
    const allPosts = await getAllPosts()
    const postIndex = allPosts.findIndex(p => p.id === postId)
    
    if (postIndex === -1) {
      throw new Error('Post not found')
    }
    
    const post = allPosts[postIndex]
    
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
    
    allPosts[postIndex] = updatedPost
    await savePosts(allPosts)
    
    return updatedPost
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
    await initStorage()
    
    const allPosts = await getAllPosts()
    const filteredPosts = allPosts.filter(p => p.id !== postId)
    
    if (filteredPosts.length === allPosts.length) {
      throw new Error('Post not found')
    }
    
    await savePosts(filteredPosts)
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

