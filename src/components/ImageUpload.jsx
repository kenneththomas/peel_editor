import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import './ImageUpload.css'

function ImageUpload({ onImageUpload, uploadedImage, onClear }) {
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      onImageUpload(acceptedFiles[0])
    }
  }, [onImageUpload])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    multiple: false
  })

  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile()
          onImageUpload(blob)
          break
        }
      }
    }
  }, [onImageUpload])

  return (
    <div className="image-upload-container">
      <h2>Input Image</h2>
      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? 'active' : ''}`}
        onPaste={handlePaste}
      >
        <input {...getInputProps()} />
        {uploadedImage ? (
          <div className="image-preview-container">
            <img
              src={uploadedImage.preview}
              alt="Uploaded"
              className="image-preview"
            />
            <button
              onClick={(e) => {
                e.stopPropagation()
                onClear()
              }}
              className="clear-button"
            >
              Clear
            </button>
          </div>
        ) : (
          <div className="dropzone-content">
            <p className="dropzone-text">
              {isDragActive
                ? 'Drop the image here...'
                : 'Drag & drop an image, paste from clipboard, or click to select'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ImageUpload

