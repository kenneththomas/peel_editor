// Video service for managing video tags and metadata
const STORAGE_KEY = 'videoTags'

// Get all video tags
export function getVideoTags() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch (error) {
    console.error('Error loading video tags:', error)
    return {}
  }
}

// Save video tags
function saveVideoTags(tags) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tags))
  } catch (error) {
    console.error('Error saving video tags:', error)
  }
}

// Get tags for a specific video
export function getVideoTag(filePath) {
  const tags = getVideoTags()
  return tags[filePath] || []
}

// Add a tag to a video
export function addVideoTag(filePath, tag) {
  const tags = getVideoTags()
  if (!tags[filePath]) {
    tags[filePath] = []
  }
  const normalizedTag = tag.trim().toLowerCase()
  if (!tags[filePath].includes(normalizedTag)) {
    tags[filePath].push(normalizedTag)
    saveVideoTags(tags)
  }
}

// Remove a tag from a video
export function removeVideoTag(filePath, tag) {
  const tags = getVideoTags()
  if (tags[filePath]) {
    tags[filePath] = tags[filePath].filter(t => t !== tag)
    if (tags[filePath].length === 0) {
      delete tags[filePath]
    }
    saveVideoTags(tags)
  }
}

// Get all videos with a specific tag
export function getVideosByTag(tag) {
  const tags = getVideoTags()
  const normalizedTag = tag.trim().toLowerCase()
  return Object.keys(tags).filter(filePath => 
    tags[filePath].includes(normalizedTag)
  )
}

// Get all unique tags
export function getAllTags() {
  const tags = getVideoTags()
  const allTags = new Set()
  Object.values(tags).forEach(videoTags => {
    videoTags.forEach(tag => allTags.add(tag))
  })
  return Array.from(allTags).sort()
}

// Remove all tags for a video (when video is deleted)
export function removeVideoTags(filePath) {
  const tags = getVideoTags()
  delete tags[filePath]
  saveVideoTags(tags)
}

// Search videos by tag
export function searchVideosByTags(searchTags) {
  const tags = getVideoTags()
  const normalizedSearchTags = searchTags.map(t => t.trim().toLowerCase())
  
  return Object.keys(tags).filter(filePath => {
    const videoTags = tags[filePath]
    return normalizedSearchTags.some(searchTag => 
      videoTags.includes(searchTag)
    )
  })
}
