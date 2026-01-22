import express from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs/promises'
import { createReadStream } from 'fs'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Supported video extensions
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv']

// Helper function to check if file is a video
function isVideoFile(filename) {
  const ext = path.extname(filename).toLowerCase()
  return VIDEO_EXTENSIONS.includes(ext)
}

// Recursively get all video files in a directory
async function getVideoFiles(dirPath, basePath = '') {
  const files = []
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)
      const relativePath = path.join(basePath, entry.name)
      
      if (entry.isDirectory()) {
        // Recursively search subdirectories
        const subFiles = await getVideoFiles(fullPath, relativePath)
        files.push(...subFiles)
      } else if (entry.isFile() && isVideoFile(entry.name)) {
        const stats = await fs.stat(fullPath)
        files.push({
          name: entry.name,
          path: relativePath.replace(/\\/g, '/'), // Normalize path separators
          fullPath: fullPath,
          size: stats.size,
          modified: stats.mtime.toISOString()
        })
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error.message)
  }
  
  return files
}

// Serve video files
app.get('/api/videos/file', async (req, res) => {
  try {
    const { filePath } = req.query
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' })
    }

    const normalizedPath = path.resolve(filePath)
    
    // Security check: ensure file exists and is a video
    let stats
    try {
      stats = await fs.stat(normalizedPath)
      if (!stats.isFile()) {
        return res.status(400).json({ error: 'Path is not a file' })
      }
      
      if (!isVideoFile(normalizedPath)) {
        return res.status(400).json({ error: 'File is not a video' })
      }
    } catch (error) {
      return res.status(404).json({ error: 'File not found' })
    }

    // Determine content type based on file extension
    const ext = path.extname(normalizedPath).toLowerCase()
    const contentTypes = {
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.ogg': 'video/ogg',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.mkv': 'video/x-matroska'
    }
    const contentType = contentTypes[ext] || 'video/mp4'

    // Set appropriate headers for video streaming
    res.setHeader('Content-Type', contentType)
    res.setHeader('Accept-Ranges', 'bytes')
    res.setHeader('Content-Length', stats.size)
    
    // Stream the file
    const fileStream = createReadStream(normalizedPath)
    fileStream.pipe(res)
    
    fileStream.on('error', (error) => {
      console.error('Error streaming video file:', error)
      if (!res.headersSent) {
        res.status(500).json({ error: error.message })
      }
    })
  } catch (error) {
    console.error('Error serving video file:', error)
    if (!res.headersSent) {
      res.status(500).json({ error: error.message })
    }
  }
})

// API Routes

// Get videos from a folder
app.post('/api/videos/list', async (req, res) => {
  try {
    const { folderPath } = req.body
    
    if (!folderPath) {
      return res.status(400).json({ error: 'Folder path is required' })
    }

    // Security: Ensure the path is absolute and exists
    const normalizedPath = path.resolve(folderPath)
    
    try {
      const stats = await fs.stat(normalizedPath)
      if (!stats.isDirectory()) {
        return res.status(400).json({ error: 'Path is not a directory' })
      }
    } catch (error) {
      return res.status(404).json({ error: 'Directory not found' })
    }

    const videos = await getVideoFiles(normalizedPath)
    
    res.json({ videos })
  } catch (error) {
    console.error('Error listing videos:', error)
    res.status(500).json({ error: error.message })
  }
})

// Delete a video file
app.delete('/api/videos/delete', async (req, res) => {
  try {
    const { filePath } = req.body
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' })
    }

    // Security: Ensure the path is absolute and within allowed directories
    const normalizedPath = path.resolve(filePath)
    
    // Check if file exists
    try {
      const stats = await fs.stat(normalizedPath)
      if (!stats.isFile()) {
        return res.status(400).json({ error: 'Path is not a file' })
      }
      
      if (!isVideoFile(normalizedPath)) {
        return res.status(400).json({ error: 'File is not a video' })
      }
    } catch (error) {
      return res.status(404).json({ error: 'File not found' })
    }

    // Delete the file
    await fs.unlink(normalizedPath)
    
    res.json({ success: true, message: 'File deleted successfully' })
  } catch (error) {
    console.error('Error deleting video:', error)
    res.status(500).json({ error: error.message })
  }
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`)
})
