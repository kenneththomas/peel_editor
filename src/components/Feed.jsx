import { useState, useEffect, useRef } from 'react'
import { getAllPosts, createPost } from '../services/feed'
import { getProfile } from '../services/profile'
import PostDetailModal from './PostDetailModal'
import './Feed.css'

function Feed({ onUsernameClick, refreshTrigger }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [uploadImage, setUploadImage] = useState(null)
  const [uploadImagePreview, setUploadImagePreview] = useState(null)
  const [uploadUsername, setUploadUsername] = useState('')
  const [uploadCaption, setUploadCaption] = useState('')
  const [uploadTaggedUsernames, setUploadTaggedUsernames] = useState('')
  const [uploading, setUploading] = useState(false)
  const [selectedPost, setSelectedPost] = useState(null)
  const [profilePictures, setProfilePictures] = useState({})
  const fileInputRef = useRef(null)

  useEffect(() => {
    loadPosts()
  }, [refreshTrigger])

  const loadPosts = async () => {
    setLoading(true)
    try {
      const allPosts = await getAllPosts()
      setPosts(allPosts)
      
      // Fetch profile pictures for all unique usernames (including tagged users)
      const uniqueUsernames = new Set()
      allPosts.forEach(post => {
        uniqueUsernames.add(post.username)
        if (post.taggedUsernames) {
          post.taggedUsernames.forEach(username => uniqueUsernames.add(username))
        }
      })
      
      const profilePicsMap = {}
      
      await Promise.all(
        Array.from(uniqueUsernames).map(async (username) => {
          try {
            const profile = await getProfile(username)
            profilePicsMap[username] = profile.profilePicture
          } catch (error) {
            console.error(`Error loading profile for ${username}:`, error)
            profilePicsMap[username] = null
          }
        })
      )
      
      setProfilePictures(profilePicsMap)
    } catch (error) {
      console.error('Error loading posts:', error)
      setPosts([])
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setUploadImage(file)
      const reader = new FileReader()
      reader.onload = (event) => {
        setUploadImagePreview(event.target.result)
      }
      reader.readAsDataURL(file)
      setShowUpload(true)
    }
  }

  const handleImageDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setUploadImage(file)
      const reader = new FileReader()
      reader.onload = (event) => {
        setUploadImagePreview(event.target.result)
      }
      reader.readAsDataURL(file)
      setShowUpload(true)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleClearUpload = () => {
    setUploadImage(null)
    setUploadImagePreview(null)
    setUploadUsername('')
    setUploadCaption('')
    setUploadTaggedUsernames('')
    setShowUpload(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmitPost = async (e) => {
    e.preventDefault()
    
    if (!uploadImage || !uploadImagePreview) {
      alert('Please select an image')
      return
    }

    if (!uploadUsername.trim()) {
      alert('Please enter a username')
      return
    }

    setUploading(true)
    try {
      // Convert image to data URL for storage
      const imageUrl = uploadImagePreview
      
      // Parse tagged usernames (comma-separated)
      const tags = uploadTaggedUsernames.trim()
        ? uploadTaggedUsernames.split(',').map(t => t.trim()).filter(t => t)
        : []
      
      await createPost(imageUrl, uploadUsername.trim(), uploadCaption.trim(), tags)
      
      // Reset form and reload posts
      handleClearUpload()
      await loadPosts()
      
      // Trigger refresh in parent component
      if (refreshTrigger !== undefined) {
        // The parent will handle the refresh via refreshTrigger prop
      }
    } catch (error) {
      console.error('Error creating post:', error)
      alert('Failed to create post: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  const handleUsernameClick = (username) => {
    if (onUsernameClick) {
      onUsernameClick(username)
    }
  }

  const handlePostClick = (post) => {
    setSelectedPost(post)
  }

  const handleCloseModal = () => {
    setSelectedPost(null)
  }

  const handlePostUpdate = async () => {
    await loadPosts()
  }

  const formatDate = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const formatUsernames = (post) => {
    const allUsernames = [post.username, ...(post.taggedUsernames || [])]
    return allUsernames.join(' & ')
  }

  const getAllUsernames = (post) => {
    return [post.username, ...(post.taggedUsernames || [])]
  }

  if (loading) {
    return (
      <div className="feed-container">
        <div className="feed-header">
          <h2>Feed</h2>
        </div>
        <div className="feed-loading">
          <p>Loading feed...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="feed-container">
      <div className="feed-header">
        <h2>Feed</h2>
      </div>
      
      {/* Upload Section */}
      <div className="feed-upload-section">
        {!showUpload ? (
          <div
            className="feed-upload-dropzone"
            onDrop={handleImageDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <div className="feed-upload-dropzone-content">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <p className="feed-upload-text">Click to upload or drag and drop an image</p>
              <p className="feed-upload-hint">Create a new post</p>
            </div>
          </div>
        ) : (
          <form className="feed-upload-form" onSubmit={handleSubmitPost}>
            <div className="feed-upload-preview-section">
              <div className="feed-upload-image-preview">
                <img src={uploadImagePreview} alt="Preview" />
                <button
                  type="button"
                  onClick={handleClearUpload}
                  className="feed-upload-remove"
                  title="Remove image"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="feed-upload-fields">
              <div className="feed-upload-field">
                <label htmlFor="feed-username">Username *</label>
                <input
                  id="feed-username"
                  type="text"
                  value={uploadUsername}
                  onChange={(e) => setUploadUsername(e.target.value)}
                  placeholder="Enter username"
                  required
                  disabled={uploading}
                />
              </div>
              
              <div className="feed-upload-field">
                <label htmlFor="feed-caption">Caption</label>
                <textarea
                  id="feed-caption"
                  value={uploadCaption}
                  onChange={(e) => setUploadCaption(e.target.value)}
                  placeholder="Write a caption..."
                  rows="3"
                  disabled={uploading}
                />
              </div>
              
              <div className="feed-upload-field">
                <label htmlFor="feed-tagged">Tag Profiles (comma-separated)</label>
                <input
                  id="feed-tagged"
                  type="text"
                  value={uploadTaggedUsernames}
                  onChange={(e) => setUploadTaggedUsernames(e.target.value)}
                  placeholder="username1, username2, username3"
                  disabled={uploading}
                />
                <small style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  Separate multiple usernames with commas. Tagged profiles will see this post on their profile.
                </small>
              </div>
            </div>
            
            <div className="feed-upload-actions">
              <button
                type="button"
                onClick={handleClearUpload}
                className="feed-upload-cancel"
                disabled={uploading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="feed-upload-submit"
                disabled={uploading || !uploadUsername.trim()}
              >
                {uploading ? 'Posting...' : 'Post'}
              </button>
            </div>
          </form>
        )}
      </div>

      {posts.length === 0 ? (
        <div className="feed-empty">
          <p>No posts yet</p>
          <p className="feed-empty-hint">Upload an image above to create your first post</p>
        </div>
      ) : (
        <div className="feed-content">
          {posts.map((post) => {
            const allUsernames = getAllUsernames(post)
            const displayUsernames = formatUsernames(post)
            
            return (
            <div key={post.id} className="feed-post">
              <div className="feed-post-header">
                <div className="feed-post-user-info">
                  {profilePictures[post.username] ? (
                    <img
                      src={profilePictures[post.username]}
                      alt={`${post.username}'s profile`}
                      className="feed-post-profile-picture"
                    />
                  ) : (
                    <div className="feed-post-profile-picture-placeholder">
                      <span>{post.username.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px' }}>
                    {allUsernames.map((username, idx) => (
                      <span key={username}>
                        <button
                          className="feed-post-username"
                          onClick={() => handleUsernameClick(username)}
                        >
                          {username}
                        </button>
                        {idx < allUsernames.length - 1 && <span style={{ color: '#8e8e8e' }}> & </span>}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="feed-post-time">{formatDate(post.timestamp)}</span>
              </div>
              
              <div className="feed-post-image-wrapper">
                <img
                  src={post.imageUrl}
                  alt={post.caption || `Post by ${post.username}`}
                  className="feed-post-image"
                  onClick={() => handlePostClick(post)}
                />
              </div>
              
              <div className="feed-post-actions">
                <button className="feed-action-button feed-like-button" aria-label="Like">
                  ♡
                </button>
                <button className="feed-action-button feed-share-button" aria-label="Share">
                  ↪
                </button>
              </div>
              
              {post.likesCount > 0 && (
                <div className="feed-post-likes">
                  <strong>{post.likesCount} {post.likesCount === 1 ? 'like' : 'likes'}</strong>
                </div>
              )}
              
              <div className="feed-post-caption">
                <div className="feed-post-caption-user-info">
                  {profilePictures[post.username] ? (
                    <img
                      src={profilePictures[post.username]}
                      alt={`${post.username}'s profile`}
                      className="feed-post-profile-picture-inline"
                    />
                  ) : (
                    <div className="feed-post-profile-picture-placeholder-inline">
                      <span>{post.username.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px' }}>
                    {allUsernames.map((username, idx) => (
                      <span key={username}>
                        <button
                          className="feed-post-username-inline"
                          onClick={() => handleUsernameClick(username)}
                        >
                          {username}
                        </button>
                        {idx < allUsernames.length - 1 && <span style={{ color: '#262626' }}> & </span>}
                      </span>
                    ))}
                  </div>
                </div>
                {post.caption && <span>{post.caption}</span>}
              </div>
            </div>
          )})}
        </div>
      )}

      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          onClose={handleCloseModal}
          onUsernameClick={onUsernameClick}
          onUpdate={handlePostUpdate}
        />
      )}
    </div>
  )

}

export default Feed

