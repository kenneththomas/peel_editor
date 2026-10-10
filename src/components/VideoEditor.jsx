import { useState, useEffect, useRef } from 'react'
import { 
  getVideoTag, 
  addVideoTag, 
  removeVideoTag, 
  getAllTags, 
  searchVideosByTags,
  removeVideoTags 
} from '../services/video'
import { listVideos, deleteVideo, checkHealth, stitchVideos, setBackendToken } from '../services/videoApi'
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
  const [playlistMode, setPlaylistMode] = useState(false)
  const [selectedForPlaylist, setSelectedForPlaylist] = useState([])
  const [showPlaylistPlayer, setShowPlaylistPlayer] = useState(false)
  const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState(0)
  const [useBackend, setUseBackend] = useState(false)
  const [backendAvailable, setBackendAvailable] = useState(false)
  const [backendToken, setToken] = useState('')
  const [backendConfigured, setBackendConfigured] = useState(false)
  const [loading, setLoading] = useState(false)
  const [videosDeleted, setVideosDeleted] = useState(0)
  const [spaceFreed, setSpaceFreed] = useState(0)
  const videoRefs = useRef({})
  const stitchPreviewRef = useRef(null)
  const playlistVideoRef = useRef(null)
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
      const health = await checkHealth()
      setBackendConfigured(health.configured)
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
    setSelectedForPlaylist([])
    setUseBackend(false)
    setVideosDeleted(0)
    setSpaceFreed(0)
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
        url: `${API_BASE_URL}/api/videos/file?id=${encodeURIComponent(video.id)}`,
        file: null // Will need to fetch for stitching
      }))

      setVideos(videoData)
      setSelectedFolder(folderPath)
      setSelectedVideo(null)
      setSearchQuery('')
      setSelectedTags([])
      setSelectedForStitch([])
      setSelectedForPlaylist([])
      setUseBackend(true)
      setVideosDeleted(0)
      setSpaceFreed(0)
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
    } else if (playlistMode) {
      togglePlaylistSelection(video)
    } else {
      setSelectedVideo(video)
    }
  }

  const handleDelete = async (video, e) => {
    e?.stopPropagation?.()
    if (window.confirm(`Are you sure you want to delete "${video.name}"? This will permanently delete the file.`)) {
      const wasSelected = selectedVideo?.path === video.path
      const idx = filteredVideos.findIndex(v => v.path === video.path)
      const nextVideo = wasSelected && idx >= 0
        ? (filteredVideos[idx + 1] ?? filteredVideos[idx - 1] ?? null)
        : null

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
        
        // Update counters
        setVideosDeleted(prev => prev + 1)
        if (video.size) {
          setSpaceFreed(prev => prev + video.size)
        }
        
        // Remove tags
        removeVideoTags(video.path)
        
        // Remove from videos list
        setVideos(prev => prev.filter(v => v.path !== video.path))
        
        if (wasSelected) {
          setSelectedVideo(nextVideo)
        }
        
        setSelectedForStitch(prev => prev.filter(v => v.path !== video.path))
        setSelectedForPlaylist(prev => prev.filter(v => v.path !== video.path))
        
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

  const togglePlaylistSelection = (video) => {
    setSelectedForPlaylist(prev => {
      const exists = prev.find(v => v.path === video.path)
      if (exists) {
        return prev.filter(v => v.path !== video.path)
      } else {
        return [...prev, video]
      }
    })
  }

  const handlePlayPlaylist = () => {
    if (selectedForPlaylist.length === 0) {
      alert('Please select at least one video for the playlist')
      return
    }
    setCurrentPlaylistIndex(0)
    setShowPlaylistPlayer(true)
  }

  const handlePlaylistVideoEnded = () => {
    // Move to next video in playlist
    setCurrentPlaylistIndex(prev => {
      const nextIndex = (prev + 1) % selectedForPlaylist.length
      return nextIndex
    })
  }

  const handleClosePlaylistPlayer = () => {
    setShowPlaylistPlayer(false)
    setCurrentPlaylistIndex(0)
    if (playlistVideoRef.current) {
      playlistVideoRef.current.pause()
      playlistVideoRef.current.currentTime = 0
    }
  }

  // Effect to handle video source change when playlist index changes
  useEffect(() => {
    if (showPlaylistPlayer && playlistVideoRef.current && selectedForPlaylist.length > 0) {
      playlistVideoRef.current.load()
      playlistVideoRef.current.play().catch(err => {
        console.error('Error playing video:', err)
      })
    }
  }, [currentPlaylistIndex, showPlaylistPlayer, selectedForPlaylist])

  // Left/Right arrow keys when video modal is open: navigate previous/next
  useEffect(() => {
    if (!selectedVideo || stitchMode || filteredVideos.length === 0) return

    const onKeyDown = (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      const target = e.target
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return

      e.preventDefault()
      const idx = filteredVideos.findIndex(v => v.path === selectedVideo.path)
      if (idx < 0) return

      if (e.key === 'ArrowLeft' && idx > 0) {
        setSelectedVideo(filteredVideos[idx - 1])
      } else if (e.key === 'ArrowRight' && idx < filteredVideos.length - 1) {
        setSelectedVideo(filteredVideos[idx + 1])
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedVideo, stitchMode, filteredVideos])

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

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="video-editor-container">
      <div className="video-editor-header">
        <h2>Video Editor</h2>
        {(videosDeleted > 0 || spaceFreed > 0) && (
          <div className="deletion-counter">
            <span className="counter-label">Deleted:</span>
            <span className="counter-value">{videosDeleted} video{videosDeleted !== 1 ? 's' : ''}</span>
            <span className="counter-separator">•</span>
            <span className="counter-label">Space freed:</span>
            <span className="counter-value">{formatBytes(spaceFreed)}</span>
          </div>
        )}
        <div className="video-editor-controls">
          {backendAvailable ? (
            <div className="folder-path-input-group">
              {!backendConfigured && <p>Configure video folders and an access token before loading videos. See README_BACKEND.md.</p>}
              <input type="password" aria-label="Backend access token" placeholder="Backend access token" value={backendToken}
                onChange={e => { setToken(e.target.value); setBackendToken(e.target.value) }} autoComplete="off" className="folder-path-input" />
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
                disabled={loading || !folderPath.trim() || !backendToken || !backendConfigured}
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
            <>
              <button
                className={`stitch-mode-button ${stitchMode ? 'active' : ''}`}
                onClick={() => {
                  setStitchMode(!stitchMode)
                  setSelectedForStitch([])
                  setSelectedVideo(null)
                  setPlaylistMode(false)
                  setSelectedForPlaylist([])
                }}
              >
                {stitchMode ? 'Exit Stitch Mode' : 'Stitch Videos'}
              </button>
              <button
                className={`playlist-mode-button ${playlistMode ? 'active' : ''}`}
                onClick={() => {
                  setPlaylistMode(!playlistMode)
                  setSelectedForPlaylist([])
                  setSelectedVideo(null)
                  setStitchMode(false)
                  setSelectedForStitch([])
                }}
              >
                {playlistMode ? 'Exit Playlist Mode' : 'Quick Playlist'}
              </button>
            </>
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

      {playlistMode && selectedForPlaylist.length > 0 && (
        <div className="playlist-panel">
          <div className="playlist-info">
            <div>
              <strong>{selectedForPlaylist.length}</strong> video{selectedForPlaylist.length !== 1 ? 's' : ''} selected
            </div>
            {selectedForPlaylist.length > 0 && (
              <div className="playlist-order-preview">
                Order: {selectedForPlaylist.map((v, i) => (
                  <span key={v.path} className="playlist-order-badge">{i + 1}</span>
                ))}
              </div>
            )}
          </div>
          <button
            className="playlist-play-button"
            onClick={handlePlayPlaylist}
          >
            ▶ Play Playlist ({selectedForPlaylist.length} videos)
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
              : playlistMode
              ? selectedForPlaylist.find(v => v.path === video.path)
              : selectedVideo?.path === video.path
            const videoTags = getVideoTags(video)
            
            return (
              <div
                key={video.path}
                className={`video-item ${isSelected ? 'selected' : ''} ${stitchMode && selectedForStitch.find(v => v.path === video.path) ? 'stitch-selected' : ''} ${playlistMode && selectedForPlaylist.find(v => v.path === video.path) ? 'playlist-selected' : ''}`}
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
                  {playlistMode && selectedForPlaylist.find(v => v.path === video.path) && (
                    <div className="playlist-checkmark">
                      {selectedForPlaylist.findIndex(v => v.path === video.path) + 1}
                    </div>
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
                <div className="video-modal-player-overlay">
                  <button
                    className="video-delete-button"
                    onClick={(e) => handleDelete(selectedVideo, e)}
                    title="Delete video"
                  >
                    ×
                  </button>
                </div>
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

      {showPlaylistPlayer && selectedForPlaylist.length > 0 && (
        <div className="video-modal-overlay" onClick={handleClosePlaylistPlayer}>
          <div className="playlist-player-modal" onClick={(e) => e.stopPropagation()}>
            <div className="video-modal-header">
              <h3>Quick Playlist ({currentPlaylistIndex + 1} / {selectedForPlaylist.length})</h3>
              <button
                className="video-modal-close"
                onClick={handleClosePlaylistPlayer}
                title="Close"
              >
                ×
              </button>
            </div>
            <div className="playlist-player-content">
              <div className="playlist-player-video">
                <video
                  ref={playlistVideoRef}
                  src={selectedForPlaylist[currentPlaylistIndex]?.url}
                  controls
                  autoPlay
                  onEnded={handlePlaylistVideoEnded}
                  style={{ width: '100%', maxHeight: '70vh' }}
                />
              </div>
              <div className="playlist-player-info">
                <div className="playlist-current-video">
                  <strong>Now Playing:</strong> {selectedForPlaylist[currentPlaylistIndex]?.name}
                </div>
                <div className="playlist-video-list">
                  <strong>Playlist ({selectedForPlaylist.length} videos):</strong>
                  <div className="playlist-video-items">
                    {selectedForPlaylist.map((video, index) => (
                      <div
                        key={video.path}
                        className={`playlist-video-item ${index === currentPlaylistIndex ? 'active' : ''}`}
                        onClick={() => {
                          setCurrentPlaylistIndex(index)
                        }}
                      >
                        <span className="playlist-video-number">{index + 1}.</span>
                        <span className="playlist-video-name">{video.name}</span>
                        {index === currentPlaylistIndex && <span className="playlist-playing-indicator">▶</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default VideoEditor
