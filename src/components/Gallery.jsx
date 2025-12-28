import { useState, useEffect, useRef } from 'react'
import { getSavedImages, deleteImage, clearGallery, saveImage } from '../services/gallery'
import './Gallery.css'

function Gallery({ onImageSelect, refreshTrigger, onImport, onNewPost }) {
  const [images, setImages] = useState([])
  const [selectedImage, setSelectedImage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [uploadImage, setUploadImage] = useState(null)
  const [uploadImagePreview, setUploadImagePreview] = useState(null)
  const [uploadPrompt, setUploadPrompt] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    loadImages()
  }, [refreshTrigger])

  // Close modal on ESC key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && selectedImage) {
        setSelectedImage(null)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [selectedImage])

  const loadImages = async () => {
    setLoading(true)
    try {
      const savedImages = await getSavedImages()
      setImages(savedImages)
    } catch (error) {
      console.error('Error loading images:', error)
      setImages([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (imageId, e) => {
    e.stopPropagation()
    if (window.confirm('Are you sure you want to delete this image?')) {
      try {
        await deleteImage(imageId)
        await loadImages()
        if (selectedImage?.id === imageId) {
          setSelectedImage(null)
        }
      } catch (error) {
        console.error('Error deleting image:', error)
        alert('Failed to delete image')
      }
    }
  }

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to clear all images? This cannot be undone.')) {
      try {
        await clearGallery()
        await loadImages()
        setSelectedImage(null)
      } catch (error) {
        console.error('Error clearing gallery:', error)
        alert('Failed to clear gallery')
      }
    }
  }

  const handleImageClick = (image) => {
    setSelectedImage(image)
  }

  const handleImport = () => {
    if (selectedImage && onImport) {
      onImport(selectedImage)
      setSelectedImage(null)
    }
  }

  const handleCloseModal = (e) => {
    // Close modal when clicking the backdrop
    if (e.target === e.currentTarget) {
      setSelectedImage(null)
    }
  }

  const formatDate = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleString()
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
    setUploadPrompt('')
    setShowUpload(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSaveImage = async (e) => {
    e.preventDefault()
    
    if (!uploadImage || !uploadImagePreview) {
      alert('Please select an image')
      return
    }

    setUploading(true)
    try {
      await saveImage(uploadImagePreview, { prompt: uploadPrompt.trim() })
      
      // Reset form and reload images
      handleClearUpload()
      await loadImages()
      
      // Notify parent component to update count
      if (refreshTrigger !== undefined) {
        // The parent will handle the refresh via refreshTrigger prop
      }
    } catch (error) {
      console.error('Error saving image:', error)
      alert('Failed to save image: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="gallery-container">
        <div className="gallery-header">
          <h2>Gallery</h2>
        </div>
        <div className="gallery-empty">
          <p>Loading gallery...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="gallery-container">
      <div className="gallery-header">
        <h2>Gallery {images.length > 0 && `(${images.length})`}</h2>
        {images.length > 0 && (
          <button onClick={handleClearAll} className="clear-all-button">
            Clear All
          </button>
        )}
      </div>
      
      {/* Upload Section */}
      <div className="gallery-upload-section">
        {!showUpload ? (
          <div
            className="gallery-upload-dropzone"
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
            <div className="gallery-upload-dropzone-content">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <p className="gallery-upload-text">Click to upload or drag and drop an image</p>
              <p className="gallery-upload-hint">Add an image to your gallery</p>
            </div>
          </div>
        ) : (
          <form className="gallery-upload-form" onSubmit={handleSaveImage}>
            <div className="gallery-upload-preview-section">
              <div className="gallery-upload-image-preview">
                <img src={uploadImagePreview} alt="Preview" />
                <button
                  type="button"
                  onClick={handleClearUpload}
                  className="gallery-upload-remove"
                  title="Remove image"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="gallery-upload-fields">
              <div className="gallery-upload-field">
                <label htmlFor="gallery-prompt">Prompt / Description (optional)</label>
                <textarea
                  id="gallery-prompt"
                  value={uploadPrompt}
                  onChange={(e) => setUploadPrompt(e.target.value)}
                  placeholder="Enter a prompt or description for this image..."
                  rows="3"
                  disabled={uploading}
                />
              </div>
            </div>
            
            <div className="gallery-upload-actions">
              <button
                type="button"
                onClick={handleClearUpload}
                className="gallery-upload-cancel"
                disabled={uploading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="gallery-upload-submit"
                disabled={uploading}
              >
                {uploading ? 'Saving...' : 'Save to Gallery'}
              </button>
            </div>
          </form>
        )}
      </div>

      {images.length === 0 ? (
        <div className="gallery-empty">
          <p>No saved images yet</p>
          <p className="gallery-empty-hint">Upload an image above to add it to your gallery</p>
        </div>
      ) : (
        <div className="gallery-content">
          <div className="gallery-grid">
            {images.map((image) => (
              <div
                key={image.id}
                className={`gallery-item ${selectedImage?.id === image.id ? 'selected' : ''}`}
                onClick={() => handleImageClick(image)}
              >
                <div className="gallery-item-image">
                  <img src={image.imageUrl} alt={image.prompt || 'Saved image'} />
                </div>
                <div className="gallery-item-overlay">
                  <button
                    className="gallery-delete-button"
                    onClick={(e) => handleDelete(image.id, e)}
                    title="Delete image"
                  >
                    ×
                  </button>
                </div>
                {image.prompt && (
                  <div className="gallery-item-prompt">
                    {image.prompt.length > 50 
                      ? image.prompt.substring(0, 50) + '...' 
                      : image.prompt}
                  </div>
                )}
                <div className="gallery-item-date">
                  {formatDate(image.timestamp)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedImage && (
        <div className="gallery-modal-overlay" onClick={handleCloseModal}>
          <div className="gallery-modal" onClick={(e) => e.stopPropagation()}>
            <div className="gallery-modal-header">
              <h3>Image Details</h3>
              <button
                className="gallery-modal-close"
                onClick={() => setSelectedImage(null)}
                title="Close"
              >
                ×
              </button>
            </div>
            <div className="gallery-modal-content">
              <div className="gallery-modal-image">
                <img src={selectedImage.imageUrl} alt={selectedImage.prompt || 'Saved image'} />
              </div>
              {selectedImage.prompt && (
                <div className="gallery-modal-prompt">
                  <strong>Prompt:</strong>
                  <div className="gallery-modal-prompt-text">{selectedImage.prompt}</div>
                </div>
              )}
              <div className="gallery-modal-meta">
                <p><strong>Saved:</strong> {formatDate(selectedImage.timestamp)}</p>
              </div>
            </div>
            <div className="gallery-modal-actions">
              {onNewPost && (
                <button
                  onClick={() => {
                    onNewPost(selectedImage)
                    setSelectedImage(null)
                  }}
                  className="new-post-button"
                >
                  New Post
                </button>
              )}
              {onImport && (
                <button
                  onClick={handleImport}
                  className="import-button"
                >
                  Import to Input Images
                </button>
              )}
              <a
                href={selectedImage.imageUrl}
                download={`image-${selectedImage.id}.png`}
                className="download-button"
              >
                Download
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Gallery

