import { useState, useEffect, useRef } from 'react'
import ImageUpload from './components/ImageUpload'
import JSONEditor from './components/JSONEditor'
import ImageDisplay from './components/ImageDisplay'
import SettingsPanel from './components/SettingsPanel'
import Gallery from './components/Gallery'
import Feed from './components/Feed'
import Profile from './components/Profile'
import PostModal from './components/PostModal'
import VideoEditor from './components/VideoEditor'
import Dialog from './components/Dialog'
import GenerationHistory from './components/GenerationHistory'
import { generateImage } from './services/api'
import { saveImage, getImageCount, getGenerations, saveGeneration, completeGeneration } from './services/gallery'
import { createGeneration, parsePrompt, createGenerationBatch, generationGroup, MAX_GENERATIONS } from './services/generation'
import { createPost, getPostCount } from './services/feed'
import './App.css'
import './studio.css'

const DEFAULT_SETTINGS = { seed: null, model: import.meta.env.VITE_OPENROUTER_MODEL || 'bytedance-seed/seedream-5-0-flash' }
const views = ['generator', 'gallery', 'feed', 'video-editor']
const readView = () => views.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'generator'
function storedSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('settings') || '{}')
    return { ...DEFAULT_SETTINGS, ...saved, model: saved.model || (saved.useLiteModel ? 'google/gemini-3.1-flash-lite-image' : DEFAULT_SETTINGS.model) }
  } catch { return DEFAULT_SETTINGS }
}

function App() {
  const [currentView, setCurrentView] = useState(readView)
  const [videoVisited, setVideoVisited] = useState(readView() === 'video-editor')
  const [profileUsername, setProfileUsername] = useState(null)
  const [uploadedImages, setUploadedImages] = useState([])
  const [prompt, setPrompt] = useState('')
  const [activeGeneration, setActiveGeneration] = useState(null)
  const [history, setHistory] = useState([])
  const [pendingCount, setPendingCount] = useState(0)
  const [generationCount, setGenerationCount] = useState(1)
  const loading = pendingCount > 0
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState('')
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('openRouterApiKey') || '')
  const [apiUrl, setApiUrl] = useState(() => localStorage.getItem('openRouterApiUrl') || '')
  const [settings, setSettings] = useState(storedSettings)
  const [showSettings, setShowSettings] = useState(false)
  const [galleryCount, setGalleryCount] = useState(0)
  const [postCount, setPostCount] = useState(0)
  const [libraryVersion, setLibraryVersion] = useState(0)
  const [selectedImageForPost, setSelectedImageForPost] = useState(null)
  const requests = useRef(new Map())
  const historyRef = useRef([])
  const activeGroup = generationGroup(history, activeGeneration)

  useEffect(() => {
    if (currentView === 'video-editor') setVideoVisited(true)
  }, [currentView])
  useEffect(() => {
    const change = () => { setCurrentView(readView()); setProfileUsername(null) }
    window.addEventListener('hashchange', change)
    getGenerations().then(records => {
      const merged = [...historyRef.current, ...records.filter(record => !historyRef.current.some(item => item.id === record.id))]
      historyRef.current = merged; setHistory(merged)
    }).catch(err => setError(`History could not load: ${err.message}`))
    return () => { window.removeEventListener('hashchange', change); requests.current.forEach(controller => controller.abort()) }
  }, [])
  useEffect(() => {
    try { localStorage.setItem('settings', JSON.stringify(settings)) }
    catch { setError('Settings could not be saved. Check browser storage permissions.') }
  }, [settings])
  useEffect(() => {
    Promise.all([getImageCount(), getPostCount()]).then(([images, posts]) => { setGalleryCount(images); setPostCount(posts) })
      .catch(err => setError(`Library could not load: ${err.message}`))
  }, [currentView, libraryVersion])
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 5000)
    return () => clearTimeout(timer)
  }, [notice])

  function navigate(view) { setProfileUsername(null); setCurrentView(view); location.hash = view }
  function recordHistory(record) {
    historyRef.current = [record, ...historyRef.current.filter(item => item.id !== record.id)]
    setHistory(historyRef.current)
    setActiveGeneration(selected => selected?.id === record.id ? record : selected)
  }
  const handleImageUpload = (file, index) => {
    const id = crypto.randomUUID()
    setUploadedImages(prev => {
      const images = [...prev]
      images[index ?? images.length] = { id, file, preview: null }
      return images.slice(0, 2)
    })
    const reader = new FileReader()
    reader.onload = () => setUploadedImages(prev => prev.map(image => image.id === id ? { ...image, preview: reader.result } : image))
    reader.onerror = () => { setUploadedImages(prev => prev.filter(image => image.id !== id)); setError('Unable to read reference image') }
    reader.readAsDataURL(file)
  }
  const runGeneration = async (record, controller, connection) => {
    try {
      await saveGeneration(record)
      const references = await Promise.all(record.references.map(async image => {
        const response = await fetch(image.preview, { signal: controller.signal })
        if (!response.ok) throw new Error('Reference image could not be loaded')
        return new File([await response.blob()], image.name, { type: image.type })
      }))
      const result = await generateImage(connection.key, parsePrompt(record.prompt), references, record.settings, connection.url, controller.signal)
      const completed = { ...record, status: 'completed', result }
      recordHistory(completed)
      try {
        recordHistory(await completeGeneration(record, result))
      } catch (err) {
        await saveGeneration(completed).catch(() => {})
        setError(`Image generated, but its local copy could not be saved: ${err.message}. Download it now.`)
      }
    } catch (err) {
      const failed = { ...record, status: err.name === 'AbortError' ? 'cancelled' : 'failed', error: err.name === 'AbortError' ? 'Request cancelled' : err.message }
      recordHistory(failed)
      await saveGeneration(failed).catch(() => {})
      if (err.name !== 'AbortError') setError(err.message || 'Failed to generate image')
    } finally {
      requests.current.delete(record.id)
      setPendingCount(requests.current.size)
    }
  }
  const handleGenerate = (additional = false) => {
    if (!apiKey) { setShowSettings(true); setError('Add an OpenRouter API key to generate images.'); return }
    let source, records
    try {
      if (additional) {
        if (!activeGeneration) return
        source = activeGeneration
      } else {
        if (requests.current.size || !prompt.trim()) return
        if (uploadedImages.some(image => !image.preview)) { setError('Wait for reference images to finish loading.'); return }
        parsePrompt(prompt)
        source = createGeneration(prompt, settings, uploadedImages)
      }
      const count = additional ? 1 : generationCount
      if (requests.current.size + count > MAX_GENERATIONS) return
      records = createGenerationBatch(source, count, additional ? generationGroup(historyRef.current, source) : [])
    } catch (err) { setError(err instanceof SyntaxError ? 'Correct the JSON prompt before generating.' : err.message); return }
    setError(null)
    // Reserve every slot before starting asynchronous work or accepting another click.
    for (const record of records) {
      requests.current.set(record.id, new AbortController())
      recordHistory(record)
    }
    setPendingCount(requests.current.size)
    if (!additional) setActiveGeneration(records[0])
    const connection = { key: apiKey, url: apiUrl }
    for (const record of records) void runGeneration(record, requests.current.get(record.id), connection)
  }
  const handleSaveImage = async () => {
    if (!activeGeneration?.result) return
    try {
      await saveImage(activeGeneration.result, {
        generationId: activeGeneration.id, prompt: activeGeneration.prompt, settings: activeGeneration.settings,
        references: activeGeneration.references, timestamp: activeGeneration.timestamp,
      })
      setLibraryVersion(version => version + 1); setNotice('Saved to your library')
    } catch (err) { setError(`Unable to save image: ${err.message}`) }
  }
  const handleImportImage = async image => {
    try {
      const response = await fetch(image.imageUrl)
      if (!response.ok) throw new Error('Image could not be loaded')
      const blob = await response.blob()
      handleImageUpload(new File([blob], `reference-${image.id}.png`, { type: blob.type }), uploadedImages.length < 2 ? uploadedImages.length : 0)
      navigate('generator'); setNotice('Image added as a reference')
    } catch (err) { setError(err.message) }
  }
  const restoreGeneration = async record => {
    try {
      const references = await Promise.all(record.references.map(async image => {
        const blob = await (await fetch(image.preview)).blob()
        return { file: new File([blob], image.name, { type: image.type }), preview: image.preview }
      }))
      setPrompt(record.prompt); setSettings(record.settings); setUploadedImages(references)
      navigate('generator'); setNotice('Original inputs restored')
    } catch (err) { setError(`Unable to restore inputs: ${err.message}`) }
  }
  const handleCreatePost = async (imageUrl, username, caption, tags = []) => {
    await createPost(imageUrl, username, caption, tags)
    setLibraryVersion(version => version + 1); setSelectedImageForPost(null); navigate('feed')
  }
  const changeCredential = (key, value, setter) => {
    setter(value)
    try { localStorage.setItem(key, value) } catch { setError('Connection settings could not be saved') }
  }

  return <div className="app">
    <header className="app-header">
      <div className="brand"><span className="brand-symbol" aria-hidden="true">◒</span><h1>Peel</h1><span className="subtitle">Creative studio</span></div>
      <button className="connection-button" onClick={() => setShowSettings(true)}><span className={`connection-dot ${apiKey ? 'ready' : ''}`} />{apiKey ? 'API key configured' : 'Connect OpenRouter'}<span>Settings</span></button>
    </header>
    <div className="app-container">
      <nav className="navigation-tabs" aria-label="Workspace">
        {views.map((view, index) => <button key={view} className={`nav-tab ${currentView === view ? 'active' : ''}`} aria-current={currentView === view ? 'page' : undefined} onClick={() => navigate(view)}>
          {['Create', 'Library', 'Feed', 'Video'][index]}{view === 'gallery' && galleryCount > 0 && <span className="nav-count">{galleryCount}</span>}{view === 'feed' && postCount > 0 && <span className="nav-count">{postCount}</span>}
        </button>)}
      </nav>
      {error && <div className="error-message" role="alert">{error}<button aria-label="Dismiss error" onClick={() => setError(null)}>×</button></div>}
      {currentView === 'generator' && <main className="main-content">
        <aside className="left-panel">
          <div className="workspace-heading"><span className="eyebrow">YOUR NEXT IDEA</span><h2>Make something new.</h2><p>Describe it. Add references. Explore the result.</p></div>
          <div className="generate-section"><label className="generation-count" htmlFor="generation-count">Generations<select id="generation-count" value={generationCount} onChange={event => setGenerationCount(Number(event.target.value))}>{[1, 2, 3, 4].map(count => <option key={count} value={count}>{count}</option>)}</select></label><button onClick={() => handleGenerate()} disabled={loading || !prompt.trim() || uploadedImages.some(image => !image.preview)} className="generate-button">{loading ? `Generating ${pendingCount}…` : generationCount === 1 ? 'Generate image' : `Generate ${generationCount} images`}<span aria-hidden="true">↗</span></button>
            {loading && <button onClick={() => requests.current.forEach(controller => controller.abort())}>Cancel all requests</button>}
          </div>
          <JSONEditor value={prompt} onChange={setPrompt} />
          <ImageUpload onImageUpload={handleImageUpload} uploadedImages={uploadedImages} onClear={index => setUploadedImages(prev => prev.filter((_, i) => i !== index))} />
          <SettingsPanel settings={settings} onChange={setSettings} apiKey={apiKey} />
        </aside>
        <section className="right-panel" aria-label="Image workspace">
          <ImageDisplay generatedImage={activeGeneration?.result} loading={activeGeneration?.status === 'pending'} generation={activeGeneration} onSave={handleSaveImage}
            generations={activeGroup} onSelect={setActiveGeneration} onGenerateAdditional={() => handleGenerate(true)} canGenerateAdditional={activeGroup.length < MAX_GENERATIONS && pendingCount < MAX_GENERATIONS}
            onImport={() => handleImportImage({ id: activeGeneration.id, imageUrl: activeGeneration.result.url })} onRestore={() => restoreGeneration(activeGeneration)} />
          <GenerationHistory records={history} selectedId={activeGeneration?.id} onSelect={setActiveGeneration} onRestore={restoreGeneration} />
        </section>
      </main>}
      {currentView === 'gallery' && <Gallery onImport={handleImportImage} onNewPost={setSelectedImageForPost} refreshTrigger={libraryVersion} onChange={() => setLibraryVersion(version => version + 1)} />}
      {currentView === 'feed' && <Feed onUsernameClick={username => { setProfileUsername(username); setCurrentView('profile') }} refreshTrigger={libraryVersion} />}
      {currentView === 'profile' && <Profile username={profileUsername} onBack={() => navigate('feed')} />}
      <div hidden={currentView !== 'video-editor'}>{videoVisited && <VideoEditor />}</div>
      {selectedImageForPost && <PostModal image={selectedImageForPost} onClose={() => setSelectedImageForPost(null)} onCreatePost={handleCreatePost} />}
    </div>
    {notice && <div className="toast" role="status">{notice}</div>}
    {showSettings && <Dialog title="Connection settings" onClose={() => setShowSettings(false)}>
      <p className="muted">Your key is stored in this browser and sent to the selected endpoint when you generate.</p>
      <label className="field-label" htmlFor="api-key">OpenRouter API key</label><input id="api-key" type="password" value={apiKey} autoComplete="off" onChange={e => changeCredential('openRouterApiKey', e.target.value, setApiKey)} placeholder="Enter your API key" />
      <details className="advanced-settings"><summary>Advanced connection</summary><label className="field-label" htmlFor="api-url">API endpoint</label><input id="api-url" type="url" value={apiUrl} onChange={e => changeCredential('openRouterApiUrl', e.target.value, setApiUrl)} placeholder="https://openrouter.ai/api/v1/images" /><p className="muted">Only use an endpoint you trust; it receives your API key and reference images.</p></details>
      <button className="generate-button" onClick={() => setShowSettings(false)}>Done</button>
    </Dialog>}
  </div>
}
export default App
