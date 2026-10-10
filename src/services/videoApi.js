// Video API service for backend communication
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
let accessToken = ''
export function setBackendToken(token) { accessToken = token }

// List videos in a folder
export async function listVideos(folderPath) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/videos/list`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ folderPath }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to list videos')
    }

    const data = await response.json()
    return data.videos
  } catch (error) {
    console.error('Error listing videos:', error)
    throw error
  }
}

// Delete a video file
export async function deleteVideo(filePath) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/videos/delete`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ filePath }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to delete video')
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error deleting video:', error)
    throw error
  }
}

// Stitch videos together
export async function stitchVideos(filePaths) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/videos/stitch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ filePaths }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to stitch videos')
    }

    // Return the blob for the stitched video
    const blob = await response.blob()
    return blob
  } catch (error) {
    console.error('Error stitching videos:', error)
    throw error
  }
}

// Health check
export async function checkHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`)
    if (!response.ok) {
      throw new Error('Backend server is not responding')
    }
    return await response.json()
  } catch (error) {
    console.error('Backend health check failed:', error)
    throw error
  }
}
