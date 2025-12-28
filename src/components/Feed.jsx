import { useState, useEffect } from 'react'
import { getAllPosts } from '../services/feed'
import './Feed.css'

function Feed({ onUsernameClick, refreshTrigger }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPosts()
  }, [refreshTrigger])

  const loadPosts = async () => {
    setLoading(true)
    try {
      const allPosts = await getAllPosts()
      setPosts(allPosts)
    } catch (error) {
      console.error('Error loading posts:', error)
      setPosts([])
    } finally {
      setLoading(false)
    }
  }

  const handleUsernameClick = (username) => {
    if (onUsernameClick) {
      onUsernameClick(username)
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

  if (posts.length === 0) {
    return (
      <div className="feed-container">
        <div className="feed-header">
          <h2>Feed</h2>
        </div>
        <div className="feed-empty">
          <p>No posts yet</p>
          <p className="feed-empty-hint">Post images from the gallery to see them here</p>
        </div>
      </div>
    )
  }

  return (
    <div className="feed-container">
      <div className="feed-header">
        <h2>Feed</h2>
      </div>
      <div className="feed-content">
        {posts.map((post) => (
          <div key={post.id} className="feed-post">
            <div className="feed-post-header">
              <button
                className="feed-post-username"
                onClick={() => handleUsernameClick(post.username)}
              >
                {post.username}
              </button>
              <span className="feed-post-time">{formatDate(post.timestamp)}</span>
            </div>
            
            <div className="feed-post-image-wrapper">
              <img
                src={post.imageUrl}
                alt={post.caption || `Post by ${post.username}`}
                className="feed-post-image"
                onClick={() => handleUsernameClick(post.username)}
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
              <button
                className="feed-post-username-inline"
                onClick={() => handleUsernameClick(post.username)}
              >
                {post.username}
              </button>
              <span>{post.caption}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Feed

