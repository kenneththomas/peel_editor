import { useState, useEffect } from 'react'
import ImageUpload from './components/ImageUpload'
import JSONEditor from './components/JSONEditor'
import ImageDisplay from './components/ImageDisplay'
import SettingsPanel from './components/SettingsPanel'
import Gallery from './components/Gallery'
import Feed from './components/Feed'
import Profile from './components/Profile'
import PostModal from './components/PostModal'
import DataMigration from './components/DataMigration'
import { generateImage } from './services/api'
import { saveImage, getImageCount } from './services/gallery'
import { createPost, getPostCount } from './services/feed'
import * as settingsService from './services/settings'
import { getMigrationStatus } from './services/migrateData'
import './App.css'

const DEFAULT_SETTINGS = {
  seed: null,
}

function App() {
  const [currentView, setCurrentView] = useState('generator') // 'generator', 'gallery', 'feed', or 'profile'
  const [profileUsername, setProfileUsername] = useState(null)
  const [uploadedImages, setUploadedImages] = useState([])
  const [prompt, setPrompt] = useState('')
  const [generatedImage, setGeneratedImage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [apiKey, setApiKey] = useState('')
  const [apiUrl, setApiUrl] = useState('')
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [galleryCount, setGalleryCount] = useState(0)
  const [postCount, setPostCount] = useState(0)
  const [selectedImageForPost, setSelectedImageForPost] = useState(null)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [showMigration, setShowMigration] = useState(false)
  const [migrationChecked, setMigrationChecked] = useState(false)

  // Check if migration is needed on mount
  useEffect(() => {
    const checkMigration = async () => {
      try {
        const status = await getMigrationStatus()
        
        // If migration is already completed, don't show the popup
        if (status.migrated) {
          setMigrationChecked(true)
          return
        }
        
        // Check if there's localStorage data that should be migrated
        const hasLocalStorage = (
          localStorage.getItem('apiKey') || 
          localStorage.getItem('apiUrl') || 
          localStorage.getItem('settings') ||
          localStorage.getItem('peel_prompts') ||
          localStorage.getItem('peel_gallery')
        )
        
        // Check for IndexedDB databases (if API is available)
        let hasIndexedDB = false
        try {
          if (indexedDB.databases) {
            const databases = await indexedDB.databases()
            hasIndexedDB = databases.length > 0 && databases.some(db => 
              db.name && (
                db.name === 'peel_feed_db' || 
                db.name === 'peel_gallery_db' || 
                db.name === 'peel_profile_db'
              )
            )
          }
        } catch (e) {
          // indexedDB.databases() not supported, check by trying to open databases
          try {
            // Try to open one of the databases to see if it exists
            const testDb = await new Promise((resolve, reject) => {
              const request = indexedDB.open('peel_feed_db')
              request.onsuccess = () => {
                resolve(request.result)
                request.result.close()
              }
              request.onerror = () => reject(request.error)
            })
            hasIndexedDB = true
          } catch (e) {
            // No IndexedDB data
          }
        }
        
        // Only show migration if there's existing data and it hasn't been migrated
        if ((hasIndexedDB || hasLocalStorage) && !status.migrated) {
          setShowMigration(true)
        }
        setMigrationChecked(true)
      } catch (error) {
        console.error('Error checking migration status:', error)
        setMigrationChecked(true)
      }
    }
    checkMigration()
  }, [])

  // Load settings from file storage on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const loadedApiKey = await settingsService.getApiKey()
        const loadedApiUrl = await settingsService.getApiUrl()
        const loadedSettings = await settingsService.getAppSettings()
        setApiKey(loadedApiKey)
        setApiUrl(loadedApiUrl)
        setSettings({ ...DEFAULT_SETTINGS, ...loadedSettings })
        setSettingsLoaded(true)
      } catch (error) {
        console.error('Error loading settings:', error)
        setSettingsLoaded(true)
      }
    }
    loadSettings()
  }, [])

  // Save settings to file storage when they change
  useEffect(() => {
    if (settingsLoaded) {
      // Don't await - allow it to fail silently if directory not initialized yet
      settingsService.setAppSettings(settings).catch(() => {
        // Silently fail - directory might not be initialized yet
      })
    }
  }, [settings, settingsLoaded])

  // Update gallery and post counts when view changes
  useEffect(() => {
    const updateCounts = async () => {
      const gallery = await getImageCount()
      const posts = await getPostCount()
      setGalleryCount(gallery)
      setPostCount(posts)
    }
    updateCounts()
  }, [currentView])

  const handleImageUpload = (file, index) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      setUploadedImages((prev) => {
        const newImages = [...prev]
        // If index is provided, use it; otherwise, find the first empty slot or append
        const targetIndex = index !== undefined ? index : newImages.length
        newImages[targetIndex] = {
          file: file,
          preview: e.target.result
        }
        return newImages.slice(0, 2) // Ensure we never have more than 2 images
      })
    }
    reader.readAsDataURL(file)
  }

  const handleClearImage = (index) => {
    if (index === undefined) {
      setUploadedImages([])
    } else {
      setUploadedImages((prev) => {
        const newImages = [...prev]
        newImages.splice(index, 1)
        return newImages
      })
    }
  }

  const handleGenerate = async () => {
    if (!apiKey) {
      setError('Please enter your API key')
      return
    }

    if (!prompt.trim()) {
      setError('Please enter a prompt')
      return
    }

    setLoading(true)
    setError(null)

    try {
      let parsedPrompt = prompt
      // Try to parse as JSON if it looks like JSON
      try {
        const jsonParsed = JSON.parse(prompt)
        parsedPrompt = jsonParsed
      } catch (e) {
        // Not JSON, use as plain text
      }

      const imageFiles = uploadedImages.map(img => img.file).filter(Boolean)
      const result = await generateImage(apiKey, parsedPrompt, imageFiles.length > 0 ? imageFiles : null, settings, apiUrl)
      setGeneratedImage(result)
    } catch (err) {
      console.error('Generation error:', err)
      setError(err.message || 'Failed to generate image')
    } finally {
      setLoading(false)
    }
  }

  const handleApiKeyChange = async (e) => {
    const key = e.target.value
    setApiKey(key)
    try {
      await settingsService.setApiKey(key)
    } catch (error) {
      console.error('Error saving API key:', error)
    }
  }

  const handleApiUrlChange = async (e) => {
    const url = e.target.value
    setApiUrl(url)
    try {
      await settingsService.setApiUrl(url)
    } catch (error) {
      console.error('Error saving API URL:', error)
    }
  }

  const handleSaveImage = async (imageData, imagePrompt) => {
    try {
      await saveImage(imageData, { prompt: imagePrompt })
      const count = await getImageCount()
      setGalleryCount(count)
      alert('Image saved to gallery!')
    } catch (error) {
      console.error('Error saving image:', error)
      alert('Failed to save image: ' + error.message)
    }
  }

  const handleGalleryImageSelect = (image) => {
    // This is called when clicking an image - modal is handled by Gallery component
  }

  const handleImportImage = async (image) => {
    // Import image to input images
    try {
      // Convert image URL to File object
      const response = await fetch(image.imageUrl)
      const blob = await response.blob()
      const file = new File([blob], `gallery-image-${image.id}.png`, { type: blob.type || 'image/png' })
      
      // Find the first available slot for the image
      const nextIndex = uploadedImages.length < 2 ? uploadedImages.length : 0
      handleImageUpload(file, nextIndex)
      
      // Switch to generator view
      setCurrentView('generator')
    } catch (error) {
      console.error('Error importing image:', error)
      alert('Failed to import image: ' + error.message)
    }
  }

  const handleNewPost = (image) => {
    setSelectedImageForPost(image)
  }

  const handleCreatePost = async (imageUrl, username, caption, taggedUsernames = []) => {
    await createPost(imageUrl, username, caption, taggedUsernames)
    const count = await getPostCount()
    setPostCount(count)
    setSelectedImageForPost(null)
    if (currentView !== 'feed') {
      setCurrentView('feed')
    }
  }

  const handleUsernameClick = (username) => {
    setProfileUsername(username)
    setCurrentView('profile')
  }

  const handleBackFromProfile = () => {
    setProfileUsername(null)
    setCurrentView('feed')
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Peel</h1>
        <p className="subtitle">JSON-style Photo Generation with Google Nano Banana Pro</p>
      </header>

      <div className="app-container">
        <div className="navigation-tabs">
          <button
            className={`nav-tab ${currentView === 'generator' ? 'active' : ''}`}
            onClick={() => {
              setCurrentView('generator')
              setProfileUsername(null)
            }}
          >
            Generator
          </button>
          <button
            className={`nav-tab ${currentView === 'gallery' ? 'active' : ''}`}
            onClick={() => {
              setCurrentView('gallery')
              setProfileUsername(null)
            }}
          >
            Gallery {galleryCount > 0 && `(${galleryCount})`}
          </button>
          <button
            className={`nav-tab ${currentView === 'feed' ? 'active' : ''}`}
            onClick={() => {
              setCurrentView('feed')
              setProfileUsername(null)
            }}
          >
            Feed {postCount > 0 && `(${postCount})`}
          </button>
        </div>

        <div className="api-key-section">
          <div className="api-key-row">
            <label htmlFor="api-key">API Key:</label>
            <input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={handleApiKeyChange}
              placeholder="Enter your Google Nano Banana Pro API key"
              className="api-key-input"
            />
          </div>
          <div className="api-key-row">
            <label htmlFor="api-url">API Endpoint (optional):</label>
            <input
              id="api-url"
              type="text"
              value={apiUrl}
              onChange={handleApiUrlChange}
              placeholder="Leave empty for default endpoint"
              className="api-key-input"
            />
          </div>
        </div>

        {currentView === 'generator' ? (
          <div className="main-content">
            <div className="left-panel">
              <ImageUpload
                onImageUpload={handleImageUpload}
                uploadedImages={uploadedImages}
                onClear={handleClearImage}
              />
              
              <JSONEditor
                value={prompt}
                onChange={setPrompt}
              />
            </div>

            <div className="middle-panel">
              <SettingsPanel
                settings={settings}
                onChange={setSettings}
              />
            </div>

            <div className="right-panel">
              <div className="generate-section">
                <button
                  onClick={handleGenerate}
                  disabled={loading || !prompt.trim()}
                  className="generate-button"
                >
                  {loading ? 'Generating...' : 'Generate Image'}
                </button>
              </div>

              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}

              <ImageDisplay
                generatedImage={generatedImage}
                loading={loading}
                prompt={prompt}
                onSave={handleSaveImage}
              />
            </div>
          </div>
        ) : currentView === 'gallery' ? (
          <div className="gallery-view">
            <Gallery 
              onImageSelect={handleGalleryImageSelect}
              onImport={handleImportImage}
              onNewPost={handleNewPost}
              refreshTrigger={galleryCount}
            />
          </div>
        ) : currentView === 'feed' ? (
          <div className="feed-view">
            <Feed onUsernameClick={handleUsernameClick} refreshTrigger={postCount} />
          </div>
        ) : currentView === 'profile' ? (
          <div className="profile-view">
            <Profile 
              username={profileUsername}
              onBack={handleBackFromProfile}
            />
          </div>
        ) : null}

        {selectedImageForPost && (
          <PostModal
            image={selectedImageForPost}
            onClose={() => setSelectedImageForPost(null)}
            onCreatePost={handleCreatePost}
          />
        )}

        {showMigration && migrationChecked && (
          <DataMigration
            onComplete={() => setShowMigration(false)}
          />
        )}
      </div>
    </div>
  )
}

export default App

