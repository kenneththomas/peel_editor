import './ImageDisplay.css'

function ImageDisplay({ generatedImage, loading, prompt, onSave }) {
  if (loading) {
    return (
      <div className="image-display-container">
        <h2>Generated Image</h2>
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Generating your image...</p>
        </div>
      </div>
    )
  }

  if (!generatedImage) {
    return (
      <div className="image-display-container">
        <h2>Generated Image</h2>
        <div className="placeholder">
          <p>Your generated image will appear here</p>
        </div>
      </div>
    )
  }

  return (
    <div className="image-display-container">
      <h2>Generated Image</h2>
      <div className="generated-image-wrapper">
        {typeof generatedImage === 'string' ? (
          <img src={generatedImage} alt="Generated" className="generated-image" />
        ) : generatedImage.url ? (
          <img src={generatedImage.url} alt="Generated" className="generated-image" />
        ) : (
          <div className="image-data">
            <pre>{JSON.stringify(generatedImage, null, 2)}</pre>
          </div>
        )}
        <div className="image-actions">
          {onSave && (
            <button
              onClick={() => onSave(generatedImage, prompt)}
              className="save-button"
            >
              Save to Gallery
            </button>
          )}
          <a
            href={typeof generatedImage === 'string' ? generatedImage : generatedImage.url}
            download="generated-image.png"
            className="download-button"
          >
            Download
          </a>
        </div>
      </div>
    </div>
  )
}

export default ImageDisplay

