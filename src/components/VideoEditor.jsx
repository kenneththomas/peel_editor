import { useState, useEffect, useRef } from 'react'
import { 
  getVideoTag, 
  addVideoTag, 
  removeVideoTag, 
  getAllTags, 
  searchVideosByTags,
  removeVideoTags 
} from '../services/video'
import { listVideos, deleteVideo, checkHealth, stitchVideos } from '../services/videoApi'
import './VideoEditor.css'

// Supported video formats
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv']

function VideoEditor() {
  const [selectedFolder, setSelectedFolder] = useState(null)
  const [folderPath, setFolderPath] = useState('')
  const [videos, setVideos] = useState([])
  const [filteredVideos, setFilteredVideos] = useState([])
  const [selectedVideo, setSelectedVideo] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState([])
  const [allTags, setAllTags] = useState([])
  const [tagInput, setTagInput] = useState('')
  const [stitchMode, setStitchMode] = useState(false)
  const [selectedForStitch, setSelectedForStitch] = useState([])
  const [stitching, setStitching] = useState(false)
  const [stitchProgress, setStitchProgress] = useState('')
  const [stitchPreview, setStitchPreview] = useState(null) // Preview blob URL
  const [useBackend, setUseBackend] = useState(false)
  const [backendAvailable, setBackendAvailable] = useState(false)
  const [loading, setLoading] = useState(false)
  const videoRefs = useRef({})
  const stitchPreviewRef = useRef(null)
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

  useEffect(() => {
    updateAllTags()
  }, [videos])

  useEffect(() => {
    filterVideos()
  }, [searchQuery, selectedTags, videos])

  // Check if backend is available
  useEffect(() => {
    checkBackendHealth()
  }, [])

  const checkBackendHealth = async () => {
    try {
      await checkHealth()
      setBackendAvailable(true)
    } catch (error) {
      setBackendAvailable(false)
    }
  }

  const updateAllTags = () => {
    setAllTags(getAllTags())
  }

  const filterVideos = () => {
    let filtered = [...videos]

    // Filter by search query (filename)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(video => 
        video.name.toLowerCase().includes(query)
      )
    }

    // Filter by tags
    if (selectedTags.length > 0) {
      const matchingPaths = searchVideosByTags(selectedTags)
      filtered = filtered.filter(video => 
        matchingPaths.includes(video.path)
      )
    }

    setFilteredVideos(filtered)
  }

  const handleFolderSelect = async (e) => {
    const files = Array.from(e.target.files || [])
    const videoFiles = files.filter(file => {
      const ext = '.' + file.name.split('.').pop().toLowerCase()
      return VIDEO_EXTENSIONS.includes(ext)
    })

    const videoData = videoFiles.map(file => ({
      file: file,
      name: file.name,
      path: file.webkitRelativePath || file.name,
      url: URL.createObjectURL(file),
      size: file.size,
      fullPath: null // Not available from file input
    }))

    setVideos(videoData)
    setSelectedFolder(files.length > 0 ? files[0].webkitRelativePath?.split('/')[0] : null)
    setSelectedVideo(null)
    setSearchQuery('')
    setSelectedTags([])
    setSelectedForStitch([])
    setUseBackend(false)
  }

  const handleLoadFromBackend = async () => {
    if (!folderPath.trim()) {
      alert('Please enter a folder path')
      return
    }

    setLoading(true)
    try {
      const videoList = await listVideos(folderPath)
      
      const videoData = videoList.map(video => ({
        name: video.name,
        path: video.path,
        fullPath: video.fullPath,
        size: video.size,
        url: `${API_BASE_URL}/api/videos/file?filePath=${encodeURIComponent(video.fullPath)}`,
        file: null // Will need to fetch for stitching
      }))

      setVideos(videoData)
      setSelectedFolder(folderPath)
      setSelectedVideo(null)
      setSearchQuery('')
      setSelectedTags([])
      setSelectedForStitch([])
      setUseBackend(true)
    } catch (error) {
      console.error('Error loading videos:', error)
      alert('Failed to load videos: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleVideoClick = (video) => {
    if (stitchMode) {
      toggleStitchSelection(video)
    } else {
      setSelectedVideo(video)
    }
  }

  const handleDelete = async (video, e) => {
    e.stopPropagation()
    if (window.confirm(`Are you sure you want to delete "${video.name}"? This will permanently delete the file.`)) {
      try {
        // If using backend and we have fullPath, delete via API
        if (useBackend && video.fullPath) {
          await deleteVideo(video.fullPath)
        } else {
          // Browser mode - can't actually delete, just remove from view
          // Revoke object URL if it's a blob URL
          if (video.url && video.url.startsWith('blob:')) {
            URL.revokeObjectURL(video.url)
          }
        }
        
        // Remove tags
        removeVideoTags(video.path)
        
        // Remove from videos list
        setVideos(prev => prev.filter(v => v.path !== video.path))
        
        if (selectedVideo?.path === video.path) {
          setSelectedVideo(null)
        }
        
        setSelectedForStitch(prev => prev.filter(v => v.path !== video.path))
        
        if (!useBackend) {
          alert('Video removed from view. Note: Actual file deletion requires backend mode.')
        }
      } catch (error) {
        console.error('Error deleting video:', error)
        alert('Failed to delete video: ' + error.message)
      }
    }
  }

  const handleAddTag = (video) => {
    if (tagInput.trim()) {
      addVideoTag(video.path, tagInput.trim())
      setTagInput('')
      updateAllTags()
      if (selectedVideo?.path === video.path) {
        setSelectedVideo({ ...selectedVideo })
      }
    }
  }

  const handleRemoveTag = (video, tag) => {
    removeVideoTag(video.path, tag)
    updateAllTags()
    if (selectedVideo?.path === video.path) {
      setSelectedVideo({ ...selectedVideo })
    }
  }

  const toggleStitchSelection = (video) => {
    setSelectedForStitch(prev => {
      const exists = prev.find(v => v.path === video.path)
      if (exists) {
        return prev.filter(v => v.path !== video.path)
      } else {
        return [...prev, video]
      }
    })
  }

  const handleStitchVideos = async () => {
    if (selectedForStitch.length < 2) {
      alert('Please select at least 2 videos to stitch together')
      return
    }

    // Check if backend is available
    if (!backendAvailable) {
      alert('Backend server is required for video stitching. Please start the backend server.')
      return
    }

    // Check if videos have fullPath (required for server-side stitching)
    const videosWithoutPath = selectedForStitch.filter(v => !v.fullPath)
    if (videosWithoutPath.length > 0) {
      alert('All selected videos must be loaded from the backend. Please use "Load from Backend" to load videos.')
      return
    }

    setStitching(true)
    setStitchProgress('Preparing to stitch videos...')
    try {
      // Get file paths in order
      const filePaths = selectedForStitch.map(video => video.fullPath)
      
      setStitchProgress('Stitching videos on server (this may take a while)...')
      console.log('Sending stitch request to server with', filePaths.length, 'videos')
      
      // Call server-side stitching API
      const blob = await stitchVideos(filePaths)
      
      setStitchProgress('Creating preview...')
      // Create preview blob URL
      const previewUrl = URL.createObjectURL(blob)
      setStitchPreview(previewUrl)
      
      setStitchProgress('')
      console.log('Video stitching completed successfully')
    } catch (error) {
      console.error('Error stitching videos:', error)
      setStitchProgress('')
      alert('Failed to stitch videos: ' + error.message + '\n\nMake sure FFmpeg is installed on your system and the backend server is running.')
    } finally {
      setStitching(false)
    }
  }

  const handleSaveStitchedVideo = () => {
    if (!stitchPreview) return

    // Create download link
    const a = document.createElement('a')
    a.href = stitchPreview
    a.download = `stitched_${Date.now()}.mp4`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    // Cleanup
    handleCloseStitchPreview()
  }

  const handleCloseStitchPreview = () => {
    if (stitchPreview) {
      URL.revokeObjectURL(stitchPreview)
      setStitchPreview(null)
    }
    setStitchMode(false)
    setSelectedForStitch([])
    setStitchProgress('')
  }

  const getVideoTags = (video) => {
    return getVideoTag(video.path)
  }

  return (
    <div className="video-editor-container">
      <div className="video-editor-header">
        <h2>Video Editor</h2>
        <div className="video-editor-controls">
          {backendAvailable ? (
            <div className="folder-path-input-group">
              <input
                type="text"
                placeholder="Enter folder path (e.g., C:\\Videos\\MyFolder)"
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleLoadFromBackend()
                  }
                }}
                className="folder-path-input"
              />
              <button
                className="folder-load-button"
                onClick={handleLoadFromBackend}
                disabled={loading || !folderPath.trim()}
              >
                {loading ? 'Loading...' : 'Load Videos'}
              </button>
            </div>
          ) : (
            <div className="backend-warning">
              <p>Backend server is required. Please start the server to use video editing features.</p>
            </div>
          )}
          {selectedFolder && (
            <span className="selected-folder">{selectedFolder}</span>
          )}
          {videos.length > 0 && (
            <button
              className={`stitch-mode-button ${stitchMode ? 'active' : ''}`}
              onClick={() => {
                setStitchMode(!stitchMode)
                setSelectedForStitch([])
                setSelectedVideo(null)
              }}
            >
              {stitchMode ? 'Exit Stitch Mode' : 'Stitch Videos'}
            </button>
          )}
        </div>
      </div>

      {videos.length > 0 && (
        <div className="video-editor-filters">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search videos by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="tag-filters">
            <div className="tag-filter-label">Filter by tags:</div>
            <div className="tag-chips">
              {allTags.map(tag => (
                <button
                  key={tag}
                  className={`tag-chip ${selectedTags.includes(tag) ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedTags(prev => 
                      prev.includes(tag) 
                        ? prev.filter(t => t !== tag)
                        : [...prev, tag]
                    )
                  }}
                >
                  {tag}
                </button>
              ))}
              {selectedTags.length > 0 && (
                <button
                  className="tag-chip clear-tags"
                  onClick={() => setSelectedTags([])}
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {stitchMode && selectedForStitch.length > 0 && (
        <div className="stitch-panel">
          <div className="stitch-info">
            <div>
              <strong>{selectedForStitch.length}</strong> video{selectedForStitch.length !== 1 ? 's' : ''} selected
            </div>
            {selectedForStitch.length > 0 && (
              <div className="stitch-order-preview">
                Order: {selectedForStitch.map((v, i) => (
                  <span key={v.path} className="stitch-order-badge">{i + 1}</span>
                ))}
              </div>
            )}
          </div>
          <button
            className="stitch-button"
            onClick={handleStitchVideos}
            disabled={stitching || selectedForStitch.length < 2}
          >
            {stitching ? (stitchProgress || 'Creating Preview...') : `Create Preview (${selectedForStitch.length} videos)`}
          </button>
        </div>
      )}

      {videos.length === 0 ? (
        <div className="video-editor-empty">
          <p>No videos loaded</p>
          <p className="video-editor-empty-hint">
            {backendAvailable 
              ? 'Enter a folder path and click "Load Videos" to load videos from your computer'
              : 'Backend server is required. Please start the server to load videos.'}
          </p>
          {!backendAvailable && (
            <p className="video-editor-empty-hint" style={{ color: '#999', fontSize: '12px', marginTop: '10px' }}>
              Start the backend server with: <code>npm run dev:backend</code>
            </p>
          )}
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="video-editor-empty">
          <p>No videos match your filters</p>
          <button
            className="clear-filters-button"
            onClick={() => {
              setSearchQuery('')
              setSelectedTags([])
            }}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="video-editor-grid">
          {filteredVideos.map((video) => {
            const isSelected = stitchMode 
              ? selectedForStitch.find(v => v.path === video.path)
              : selectedVideo?.path === video.path
            const videoTags = getVideoTags(video)
            
            return (
              <div
                key={video.path}
                className={`video-item ${isSelected ? 'selected' : ''} ${stitchMode && selectedForStitch.find(v => v.path === video.path) ? 'stitch-selected' : ''}`}
                onClick={() => handleVideoClick(video)}
              >
                <div className="video-item-player">
                  <video
                    ref={el => videoRefs.current[video.path] = el}
                    src={video.url}
                    loop
                    muted
                    playsInline
                    onMouseEnter={(e) => e.target.play()}
                    onMouseLeave={(e) => {
                      e.target.pause()
                      e.target.currentTime = 0
                    }}
                  />
                  <div className="video-item-overlay">
                    <button
                      className="video-delete-button"
                      onClick={(e) => handleDelete(video, e)}
                      title="Delete video"
                    >
                      ×
                    </button>
                  </div>
                  {stitchMode && selectedForStitch.find(v => v.path === video.path) && (
                    <div className="stitch-checkmark">✓</div>
                  )}
                </div>
                <div className="video-item-info">
                  <div className="video-item-name" title={video.name}>
                    {video.name}
                  </div>
                  <div className="video-item-tags">
                    {videoTags.map(tag => (
                      <span key={tag} className="video-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {selectedVideo && !stitchMode && (
        <div className="video-modal-overlay" onClick={() => setSelectedVideo(null)}>
          <div className="video-modal" onClick={(e) => e.stopPropagation()}>
            <div className="video-modal-header">
              <h3>{selectedVideo.name}</h3>
              <button
                className="video-modal-close"
                onClick={() => setSelectedVideo(null)}
                title="Close"
              >
                ×
              </button>
            </div>
            <div className="video-modal-content">
              <div className="video-modal-player">
                <video
                  src={selectedVideo.url}
                  controls
                  loop
                  autoPlay
                  style={{ width: '100%', maxHeight: '70vh' }}
                />
              </div>
              <div className="video-modal-tags">
                <div className="video-modal-tags-section">
                  <label>Tags:</label>
                  <div className="video-modal-tags-list">
                    {getVideoTags(selectedVideo).map(tag => (
                      <span key={tag} className="video-tag">
                        {tag}
                        <button
                          className="tag-remove"
                          onClick={() => handleRemoveTag(selectedVideo, tag)}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="video-modal-tag-input">
                    <input
                      type="text"
                      placeholder="Add a tag..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddTag(selectedVideo)
                        }
                      }}
                    />
                    <button onClick={() => handleAddTag(selectedVideo)}>
                      Add Tag
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {stitchPreview && (
        <div className="video-modal-overlay" onClick={handleCloseStitchPreview}>
          <div className="stitch-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="video-modal-header">
              <h3>Preview Stitched Video</h3>
              <button
                className="video-modal-close"
                onClick={handleCloseStitchPreview}
                title="Close"
              >
                ×
              </button>
            </div>
            <div className="stitch-preview-content">
              <div className="stitch-preview-player">
                <video
                  ref={stitchPreviewRef}
                  src={stitchPreview}
                  controls
                  loop
                  autoPlay
                  style={{ width: '100%', maxHeight: '70vh' }}
                />
              </div>
              <div className="stitch-preview-info">
                <p>Preview of {selectedForStitch.length} stitched videos (in order of selection)</p>
                <div className="stitch-preview-order">
                  {selectedForStitch.map((video, index) => (
                    <span key={video.path} className="stitch-order-item">
                      {index + 1}. {video.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="stitch-preview-actions">
              <button
                className="stitch-preview-cancel"
                onClick={handleCloseStitchPreview}
              >
                Cancel
              </button>
              <button
                className="stitch-preview-save"
                onClick={handleSaveStitchedVideo}
              >
                Save Video
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default VideoEditor
