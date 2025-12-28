import { useState, useEffect } from 'react'
import { getPostsByUsername } from '../services/feed'
import './Profile.css'

function Profile({ username, onBack }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (username) {
      loadUserPosts()
    }
  }, [username])

  const loadUserPosts = async () => {
    setLoading(true)
    try {
      const userPosts = await getPostsByUsername(username)
      setPosts(userPosts)
    } catch (error) {
      console.error('Error loading user posts:', error)
      setPosts([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="profile-container">
        <div className="profile-header">
          {onBack && (
            <button className="profile-back-button" onClick={onBack}>
              ← Back
            </button>
          )}
          <h2>{username}</h2>
        </div>
        <div className="profile-loading">
          <p>Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        {onBack && (
          <button className="profile-back-button" onClick={onBack}>
            ← Back
          </button>
        )}
        <div className="profile-user-info">
          <h2>{username}</h2>
          <p className="profile-post-count">{posts.length} {posts.length === 1 ? 'post' : 'posts'}</p>
        </div>
      </div>
      
      {posts.length === 0 ? (
        <div className="profile-empty">
          <p>No posts yet</p>
        </div>
      ) : (
        <div className="profile-grid">
          {posts.map((post) => (
            <div key={post.id} className="profile-post-item">
              <img
                src={post.imageUrl}
                alt={post.caption || `Post by ${username}`}
                className="profile-post-image"
              />
              <div className="profile-post-overlay">
                <div className="profile-post-stats">
                  <span className="profile-post-likes-count">♡ {post.likesCount || 0}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Profile

