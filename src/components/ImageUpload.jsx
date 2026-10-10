import { useCallback, useEffect } from 'react'
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

  useEffect(() => {
    const handlePaste = (event) => {
      const clipboardFiles = Array.from(event.clipboardData?.files || [])
      const itemFiles = Array.from(event.clipboardData?.items || [])
        .filter((item) => item.type.startsWith('image/'))
        .map((item) => item.getAsFile())
        .filter(Boolean)
      const imageFiles = (clipboardFiles.length > 0 ? clipboardFiles : itemFiles)
        .filter((file) => file.type.startsWith('image/'))
      if (imageFiles.length === 0) return

      event.preventDefault()
      let imageIndex = uploadedImages?.length || 0
      for (const file of imageFiles) {
        if (imageIndex >= 2) break
        onImageUpload(file, imageIndex)
        imageIndex += 1
      }
    }

    // Listen on the document so pasting works even when the dropzone itself
    // does not have keyboard focus (for example after copying a screenshot).
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [onImageUpload, uploadedImages])

  const hasImages = uploadedImages && uploadedImages.length > 0
  const hasTwoImages = uploadedImages && uploadedImages.length === 2

  return (
    <div className="image-upload-container">
      <h2>Input Images {hasTwoImages ? '(2/2)' : hasImages ? '(1/2)' : ''}</h2>
      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? 'active' : ''} ${hasTwoImages ? 'has-two-images' : ''}`}
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

