import { useState, useEffect } from 'react'
import { getSavedImages, deleteImage, clearGallery } from '../services/gallery'
import './Gallery.css'

function Gallery({ onImageSelect, refreshTrigger, onImport }) {
  const [images, setImages] = useState([])
  const [selectedImage, setSelectedImage] = useState(null)
  const [loading, setLoading] = useState(true)

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

  if (images.length === 0) {
    return (
      <div className="gallery-container">
        <div className="gallery-header">
          <h2>Gallery</h2>
        </div>
        <div className="gallery-empty">
          <p>No saved images yet</p>
          <p className="gallery-empty-hint">Generate and save images to see them here</p>
        </div>
      </div>
    )
  }

  return (
    <div className="gallery-container">
      <div className="gallery-header">
        <h2>Gallery ({images.length})</h2>
        <button onClick={handleClearAll} className="clear-all-button">
          Clear All
        </button>
      </div>
      
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

