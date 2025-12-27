import { useState, useEffect } from 'react'
import ImageUpload from './components/ImageUpload'
import JSONEditor from './components/JSONEditor'
import ImageDisplay from './components/ImageDisplay'
import SettingsPanel from './components/SettingsPanel'
import { generateImage } from './services/api'
import './App.css'

const DEFAULT_SETTINGS = {
  seed: null,
}

function App() {
  const [uploadedImage, setUploadedImage] = useState(null)
  const [prompt, setPrompt] = useState('')
  const [generatedImage, setGeneratedImage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [apiKey, setApiKey] = useState(localStorage.getItem('apiKey') || '')
  const [apiUrl, setApiUrl] = useState(localStorage.getItem('apiUrl') || '')
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('settings')
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS
  })

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('settings', JSON.stringify(settings))
  }, [settings])

  const handleImageUpload = (file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      setUploadedImage({
        file: file,
        preview: e.target.result
      })
    }
    reader.readAsDataURL(file)
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

      const result = await generateImage(apiKey, parsedPrompt, uploadedImage?.file, settings, apiUrl)
      setGeneratedImage(result)
    } catch (err) {
      console.error('Generation error:', err)
      setError(err.message || 'Failed to generate image')
    } finally {
      setLoading(false)
    }
  }

  const handleApiKeyChange = (e) => {
    const key = e.target.value
    setApiKey(key)
    localStorage.setItem('apiKey', key)
  }

  const handleApiUrlChange = (e) => {
    const url = e.target.value
    setApiUrl(url)
    localStorage.setItem('apiUrl', url)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Peel</h1>
        <p className="subtitle">JSON-style Photo Generation with Google Nano Banana Pro</p>
      </header>

      <div className="app-container">
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

        <div className="main-content">
          <div className="left-panel">
            <ImageUpload
              onImageUpload={handleImageUpload}
              uploadedImage={uploadedImage}
              onClear={() => setUploadedImage(null)}
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
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App

