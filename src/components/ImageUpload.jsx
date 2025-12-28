import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import './ImageUpload.css'

function ImageUpload({ onImageUpload, uploadedImages, onClear }) {
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      // Handle up to 2 files
      const filesToUpload = acceptedFiles.slice(0, 2)
      const currentCount = uploadedImages?.length || 0
      
      filesToUpload.forEach((file, relativeIndex) => {
        const targetIndex = currentCount + relativeIndex
        if (targetIndex < 2) {
          onImageUpload(file, targetIndex)
        }
      })
    }
  }, [onImageUpload, uploadedImages])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    multiple: true
  })

  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items
    if (items) {
      let imageIndex = uploadedImages?.length || 0
      if (imageIndex >= 2) return // Already have 2 images
      
      for (let i = 0; i < items.length && imageIndex < 2; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile()
          onImageUpload(blob, imageIndex)
          imageIndex++
        }
      }
    }
  }, [onImageUpload, uploadedImages])

  const hasImages = uploadedImages && uploadedImages.length > 0
  const hasTwoImages = uploadedImages && uploadedImages.length === 2

  return (
    <div className="image-upload-container">
      <h2>Input Images {hasTwoImages ? '(2/2)' : hasImages ? '(1/2)' : ''}</h2>
      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? 'active' : ''} ${hasTwoImages ? 'has-two-images' : ''}`}
        onPaste={handlePaste}
      >
        <input {...getInputProps()} />
        {hasImages ? (
          <div className="images-preview-container">
            {uploadedImages.map((img, index) => (
              <div key={index} className="image-preview-item">
                <div className="image-preview-label">Image {index + 1}</div>
                <div className="image-preview-wrapper">
                  <img
                    src={img.preview}
                    alt={`Uploaded ${index + 1}`}
                    className="image-preview"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onClear(index)
                    }}
                    className="clear-button"
                  >
                    Clear
                  </button>
                </div>
              </div>
            ))}
            {!hasTwoImages && (
              <div className="dropzone-text-more">
                <p>Drop another image or click to select (2/2)</p>
              </div>
            )}
          </div>
        ) : (
          <div className="dropzone-content">
            <p className="dropzone-text">
              {isDragActive
                ? 'Drop the images here...'
                : 'Drag & drop up to 2 images, paste from clipboard, or click to select'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ImageUpload

