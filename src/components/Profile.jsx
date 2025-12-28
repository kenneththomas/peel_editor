import { useState, useEffect } from 'react'
import { getPostsByUsername } from '../services/feed'
import { getProfile, updateBio, updateProfilePicture } from '../services/profile'
import './Profile.css'

function Profile({ username, onBack }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState({ bio: '', profilePicture: null })
  const [isEditingBio, setIsEditingBio] = useState(false)
  const [bioText, setBioText] = useState('')
  const [isEditingPicture, setIsEditingPicture] = useState(false)

  useEffect(() => {
    if (username) {
      loadUserPosts()
      loadProfile()
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

  const loadProfile = async () => {
    try {
      const profileData = await getProfile(username)
      setProfile(profileData)
      setBioText(profileData.bio || '')
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }

  const handleSaveBio = async () => {
    try {
      await updateBio(username, bioText)
      setProfile(prev => ({ ...prev, bio: bioText }))
      setIsEditingBio(false)
    } catch (error) {
      console.error('Error saving bio:', error)
      alert('Failed to save bio: ' + error.message)
    }
  }

  const handleCancelEditBio = () => {
    setBioText(profile.bio || '')
    setIsEditingBio(false)
  }

  const handleProfilePictureChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Convert image to base64 data URL
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const profilePicture = event.target.result
        await updateProfilePicture(username, profilePicture)
        setProfile(prev => ({ ...prev, profilePicture }))
        setIsEditingPicture(false)
      } catch (error) {
        console.error('Error saving profile picture:', error)
        alert('Failed to save profile picture: ' + error.message)
      }
    }
    reader.onerror = () => {
      alert('Error reading image file')
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveProfilePicture = async () => {
    try {
      await updateProfilePicture(username, null)
      setProfile(prev => ({ ...prev, profilePicture: null }))
    } catch (error) {
      console.error('Error removing profile picture:', error)
      alert('Failed to remove profile picture: ' + error.message)
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
      </div>

      <div className="profile-info-section">
        <div className="profile-picture-container">
          {profile.profilePicture ? (
            <img 
              src={profile.profilePicture} 
              alt={`${username}'s profile`}
              className="profile-picture"
            />
          ) : (
            <div className="profile-picture-placeholder">
              <span>{username.charAt(0).toUpperCase()}</span>
            </div>
          )}
          {!isEditingPicture ? (
            <button 
              className="profile-edit-picture-btn"
              onClick={() => setIsEditingPicture(true)}
              title="Change profile picture"
            >
              📷
            </button>
          ) : (
            <div className="profile-picture-edit-controls">
              <label className="profile-upload-btn">
                Upload
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureChange}
                  style={{ display: 'none' }}
                />
              </label>
              {profile.profilePicture && (
                <button 
                  className="profile-remove-btn"
                  onClick={handleRemoveProfilePicture}
                >
                  Remove
                </button>
              )}
              <button 
                className="profile-cancel-btn"
                onClick={() => setIsEditingPicture(false)}
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="profile-user-details">
          <h2 className="profile-username">{username}</h2>
          <p className="profile-post-count">{posts.length} {posts.length === 1 ? 'post' : 'posts'}</p>
          
          <div className="profile-bio-section">
            {isEditingBio ? (
              <div className="profile-bio-edit">
                <textarea
                  value={bioText}
                  onChange={(e) => setBioText(e.target.value)}
                  placeholder="Add a bio..."
                  className="profile-bio-textarea"
                  rows={3}
                />
                <div className="profile-bio-actions">
                  <button 
                    className="profile-save-btn"
                    onClick={handleSaveBio}
                  >
                    Save
                  </button>
                  <button 
                    className="profile-cancel-btn"
                    onClick={handleCancelEditBio}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="profile-bio-display">
                {profile.bio ? (
                  <p className="profile-bio-text">{profile.bio}</p>
                ) : (
                  <p className="profile-bio-placeholder">No bio yet</p>
                )}
                <button 
                  className="profile-edit-bio-btn"
                  onClick={() => setIsEditingBio(true)}
                >
                  {profile.bio ? 'Edit Bio' : 'Add Bio'}
                </button>
              </div>
            )}
          </div>
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

