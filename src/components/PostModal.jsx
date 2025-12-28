import { useState } from 'react'
import './PostModal.css'

function PostModal({ image, onClose, onCreatePost }) {
  const [username, setUsername] = useState('')
  const [caption, setCaption] = useState('')
  const [taggedUsernames, setTaggedUsernames] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!username.trim()) {
      alert('Please enter a username')
      return
    }

    if (!image || !image.imageUrl) {
      alert('Image is required')
      return
    }

    setLoading(true)
    try {
      // Parse tagged usernames (comma-separated)
      const tags = taggedUsernames.trim()
        ? taggedUsernames.split(',').map(t => t.trim()).filter(t => t)
        : []
      
      await onCreatePost(image.imageUrl, username.trim(), caption.trim(), tags)
      onClose()
    } catch (error) {
      console.error('Error creating post:', error)
      alert('Failed to create post: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = (e) => {
    if (e.target === e.currentTarget || e.target.classList.contains('post-modal-close')) {
      onClose()
    }
  }

  if (!image) return null

  return (
    <div className="post-modal-overlay" onClick={handleClose}>
      <div className="post-modal" onClick={(e) => e.stopPropagation()}>
        <div className="post-modal-header">
          <h3>Create New Post</h3>
          <button
            className="post-modal-close"
            onClick={handleClose}
            title="Close"
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="post-modal-form">
          <div className="post-modal-preview">
            <img src={image.imageUrl} alt="Preview" />
          </div>
          
          <div className="post-modal-fields">
            <div className="post-modal-field">
              <label htmlFor="username">Username *</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
                disabled={loading}
              />
            </div>
            
            <div className="post-modal-field">
              <label htmlFor="caption">Caption</label>
              <textarea
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a caption..."
                rows="4"
                disabled={loading}
              />
            </div>
            
            <div className="post-modal-field">
              <label htmlFor="taggedUsernames">Tag Profiles (comma-separated)</label>
              <input
                id="taggedUsernames"
                type="text"
                value={taggedUsernames}
                onChange={(e) => setTaggedUsernames(e.target.value)}
                placeholder="username1, username2, username3"
                disabled={loading}
              />
              <small style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                Separate multiple usernames with commas. Tagged profiles will see this post on their profile.
              </small>
            </div>
          </div>
          
          <div className="post-modal-actions">
            <button
              type="button"
              onClick={handleClose}
              className="post-modal-cancel"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="post-modal-submit"
              disabled={loading || !username.trim()}
            >
              {loading ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PostModal

