import { useState, useEffect } from 'react'
import { updatePost } from '../services/feed'
import './PostDetailModal.css'

function PostDetailModal({ post, onClose, onUsernameClick, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false)
  const [caption, setCaption] = useState('')
  const [likesCount, setLikesCount] = useState(0)
  const [taggedUsernames, setTaggedUsernames] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (post) {
      setCaption(post.caption || '')
      setLikesCount(post.likesCount || 0)
      setTaggedUsernames((post.taggedUsernames || []).join(', '))
      setIsEditing(false)
    }
  }, [post])

  const handleSave = async () => {
    if (!post) return

    setLoading(true)
    try {
      // Parse tagged usernames (comma-separated)
      const tags = taggedUsernames.trim()
        ? taggedUsernames.split(',').map(t => t.trim()).filter(t => t)
        : []
      
      await updatePost(post.id, {
        caption: caption.trim(),
        likesCount: parseInt(likesCount) || 0,
        taggedUsernames: tags
      })
      
      if (onUpdate) {
        onUpdate()
      }
      setIsEditing(false)
    } catch (error) {
      console.error('Error updating post:', error)
      alert('Failed to update post: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    if (post) {
      setCaption(post.caption || '')
      setLikesCount(post.likesCount || 0)
      setTaggedUsernames((post.taggedUsernames || []).join(', '))
    }
    setIsEditing(false)
  }

  const getAllUsernames = () => {
    if (!post) return []
    return [post.username, ...(post.taggedUsernames || [])]
  }

  const handleClose = (e) => {
    if (e.target === e.currentTarget || e.target.classList.contains('post-detail-modal-close')) {
      onClose()
    }
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

  if (!post) return null

  return (
    <div className="post-detail-modal-overlay" onClick={handleClose}>
      <div className="post-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="post-detail-modal-header">
          <h3>Post Details</h3>
          <button
            className="post-detail-modal-close"
            onClick={handleClose}
            title="Close"
          >
            ×
          </button>
        </div>
        
        <div className="post-detail-modal-content">
          <div className="post-detail-modal-image">
            <img src={post.imageUrl} alt={post.caption || `Post by ${post.username}`} />
          </div>
          
          <div className="post-detail-modal-info">
            <div className="post-detail-modal-header-info">
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px' }}>
                {getAllUsernames().map((username, idx) => (
                  <span key={username}>
                    <button
                      className="post-detail-modal-username"
                      onClick={() => {
                        if (onUsernameClick) {
                          onUsernameClick(username)
                        }
                        onClose()
                      }}
                    >
                      {username}
                    </button>
                    {idx < getAllUsernames().length - 1 && <span style={{ color: '#8e8e8e' }}> & </span>}
                  </span>
                ))}
              </div>
              <span className="post-detail-modal-time">{formatDate(post.timestamp)}</span>
            </div>

            {!isEditing ? (
              <>
                <div className="post-detail-modal-likes">
                  <strong>{post.likesCount || 0} {post.likesCount === 1 ? 'like' : 'likes'}</strong>
                </div>
                <div className="post-detail-modal-caption">
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                    {getAllUsernames().map((username, idx) => (
                      <span key={username}>
                        <button
                          className="post-detail-modal-username-inline"
                          onClick={() => {
                            if (onUsernameClick) {
                              onUsernameClick(username)
                            }
                            onClose()
                          }}
                        >
                          {username}
                        </button>
                        {idx < getAllUsernames().length - 1 && <span style={{ color: '#262626' }}> & </span>}
                      </span>
                    ))}
                  </div>
                  <span>{post.caption || ''}</span>
                </div>
                <div className="post-detail-modal-actions">
                  <button
                    className="post-detail-modal-edit-button"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit
                  </button>
                </div>
              </>
            ) : (
              <div className="post-detail-modal-edit-form">
                <div className="post-detail-modal-field">
                  <label htmlFor="edit-caption">Caption</label>
                  <textarea
                    id="edit-caption"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Write a caption..."
                    rows="4"
                    disabled={loading}
                  />
                </div>
                
                <div className="post-detail-modal-field">
                  <label htmlFor="edit-likes">Likes Count</label>
                  <input
                    id="edit-likes"
                    type="number"
                    min="0"
                    value={likesCount}
                    onChange={(e) => setLikesCount(e.target.value)}
                    disabled={loading}
                  />
                </div>
                
                <div className="post-detail-modal-field">
                  <label htmlFor="edit-tagged">Tagged Profiles (comma-separated)</label>
                  <input
                    id="edit-tagged"
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
                
                <div className="post-detail-modal-edit-actions">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="post-detail-modal-cancel"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="post-detail-modal-save"
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PostDetailModal

